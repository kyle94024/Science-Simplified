#!/usr/bin/env node
/**
 * Token study: abstract vs. full paper through the PRODUCTION simplification
 * prompt, with exact token usage from the API.
 *
 * For every example folder it sends the abstract and the full paper through
 * the very same request simplifyArticle() builds (imported from
 * src/utils/apiHelpers.js — not a copy), records the usage the API reports
 * (input, cached input, output, reasoning), breaks the input down locally
 * into fixed prompt scaffolding vs. article text, estimates cost, and saves
 * both outputs plus a side-by-side preview page styled with the site's CSS.
 *
 * Example layout (see examples/README.md):
 *   scripts/token-study/examples/<name>/abstract.txt
 *   scripts/token-study/examples/<name>/full.pdf      (.txt .md .html .docx also fine)
 *
 * Usage:
 *   npm run token-study                       # all examples, production settings
 *   npm run token-study -- --only barnes-2026 # one example
 *   npm run token-study -- --repeats 3        # temperature is 0.7 in production; repeat to see spread
 *   npm run token-study -- --model gpt-4.1    # same prompt, different model
 *   npm run token-study -- --tenant RUNX1     # tenant changes the prompt's nomenclature addendum
 *   npm run token-study -- --dry-run          # count tokens locally, call nothing
 *
 * Results: scripts/token-study/results/<timestamp>/  (report.md, report.json,
 * preview.html, <example>/abstract.html, <example>/full.html)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { register, createRequire } from "node:module";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "../..");
const require = createRequire(path.join(REPO, "package.json"));

// ---------------------------------------------------------------------------
// Setup: args, env, and the production module
// ---------------------------------------------------------------------------

const args = parseArgs(process.argv.slice(2));
if (args.help) {
    console.log(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("*/")[0].replace(/^#!.*\n\/\*\*\n/, "").replace(/^ \* ?/gm, ""));
    process.exit(0);
}

// apiHelpers reads public/assets/example-output.html relative to cwd, and the
// tenant (which changes the prompt) comes from NEXT_PUBLIC_SITE_KEY.
process.chdir(REPO);
loadEnv(path.join(REPO, ".env"));
if (args.tenant) process.env.NEXT_PUBLIC_SITE_KEY = args.tenant;
if (!process.env.NEXT_PUBLIC_SITE_KEY) process.env.NEXT_PUBLIC_SITE_KEY = "NF";
if (!process.env.OPENAI_API_KEY && !args["dry-run"]) {
    console.error("OPENAI_API_KEY is not set (.env or environment).");
    process.exit(1);
}

register("./alias-hooks.mjs", import.meta.url);
const { buildSimplifyRequest, cleanSimplifiedHtml, SIMPLIFY_MODEL } = await import("../../src/utils/apiHelpers.js");
const { tenant } = await import("../../src/lib/config.js");
const { encode } = await import("gpt-tokenizer/encoding/o200k_base"); // gpt-4.1 / 4o / 5 families

const model = args.model || SIMPLIFY_MODEL;
// Reasoning models (gpt-5 family, o-series) are the only ones with hidden
// "reasoning" tokens, and they reject the production sampling parameters.
const isReasoningModel = /^(gpt-5|gpt-6|o\d)/.test(model);
const repeats = Math.max(1, Number(args.repeats) || 1);
const examplesDir = path.resolve(args.examples || path.join(HERE, "examples"));

// USD per 1M tokens. Verify against https://openai.com/api/pricing before quoting.
const PRICES = {
    "gpt-4.1-mini": { input: 0.4, cached: 0.1, output: 1.6 },
    "gpt-4.1": { input: 2.0, cached: 0.5, output: 8.0 },
    "gpt-4.1-nano": { input: 0.1, cached: 0.025, output: 0.4 },
    "gpt-4o": { input: 2.5, cached: 1.25, output: 10.0 },
    "gpt-4o-mini": { input: 0.15, cached: 0.075, output: 0.6 },
    "gpt-5": { input: 1.25, cached: 0.125, output: 10.0 },
    "gpt-5-mini": { input: 0.25, cached: 0.025, output: 2.0 },
    "gpt-5-nano": { input: 0.05, cached: 0.005, output: 0.4 },
};
const price = {
    input: num(args["price-in"]) ?? PRICES[model]?.input ?? null,
    cached: num(args["price-cached"]) ?? PRICES[model]?.cached ?? null,
    output: num(args["price-out"]) ?? PRICES[model]?.output ?? null,
};

// ---------------------------------------------------------------------------
// Examples
// ---------------------------------------------------------------------------

const examples = loadExamples(examplesDir, args.only);
if (examples.length === 0) {
    console.error(`No examples found in ${examplesDir}.\nEach example is a folder with abstract.(txt|md|html|pdf|docx) and full.(txt|md|html|pdf|docx).`);
    process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const outDir = path.join(HERE, "results", args["dry-run"] ? `${stamp}-dry-run` : stamp);
fs.mkdirSync(outDir, { recursive: true });

console.log(`token study — model ${model}, tenant ${tenant.shortName}, ${examples.length} example(s), ${repeats} run(s) each${args["dry-run"] ? ", DRY RUN (no API calls)" : ""}`);
console.log(`results → ${path.relative(REPO, outDir)}\n`);

// Fixed scaffolding = everything in the prompt that isn't the article. Measure
// it once from a request built around an empty article.
const scaffoldRequest = buildSimplifyRequest("");
const scaffoldTokens = countMessages(scaffoldRequest.messages);
console.log(`fixed prompt scaffolding (system instruction + example HTML/CSS + wrapper): ~${scaffoldTokens} tokens on every call`);
if (isReasoningModel) {
    console.log(`note: ${model} is a reasoning model — temperature is dropped and max_tokens sent as max_completion_tokens (same prompt, different sampling than production)`);
}
console.log("");

const { default: openai } = args["dry-run"] ? { default: null } : await import("../../src/lib/openai.js");

// ---------------------------------------------------------------------------
// Runs
// ---------------------------------------------------------------------------

const rows = [];
for (const ex of examples) {
    const exDir = path.join(outDir, ex.name);
    fs.mkdirSync(exDir, { recursive: true });
    for (const variant of ["abstract", "full"]) {
        const text = await ex.read(variant);
        const request = buildSimplifyRequest(text, { model });
        const localInput = countMessages(request.messages);
        const articleTokens = encode(text).length;

        for (let r = 1; r <= repeats; r++) {
            const label = `${ex.name} / ${variant}${repeats > 1 ? ` #${r}` : ""}`;
            const row = {
                example: ex.name, variant, run: r, model,
                input_chars: text.length, input_words: words(text).length,
                article_tokens_local: articleTokens, scaffold_tokens_local: scaffoldTokens, input_tokens_local: localInput,
            };
            if (args["dry-run"]) {
                rows.push(row);
                console.log(`  ${label.padEnd(40)} article ≈ ${articleTokens} tok, whole prompt ≈ ${localInput} tok (dry run)`);
                continue;
            }

            process.stdout.write(`  ${label.padEnd(40)} `);
            const started = Date.now();
            let res;
            try {
                // stream:false so the API returns `usage`; everything else is production.
                res = await openai.chat.completions.create({ ...request, stream: false });
            } catch (err) {
                console.log(`FAILED: ${err.status || ""} ${err.message}`);
                row.error = err.message;
                rows.push(row);
                continue;
            }
            const seconds = (Date.now() - started) / 1000;
            const html = cleanSimplifiedHtml(res.choices?.[0]?.message?.content || "");
            const u = res.usage || {};
            const cached = u.prompt_tokens_details?.cached_tokens || 0;
            const reasoning = u.completion_tokens_details?.reasoning_tokens || 0;
            const plain = stripHtml(html);

            Object.assign(row, {
                model_used: res.model,
                finish_reason: res.choices?.[0]?.finish_reason,
                seconds: round(seconds, 1),
                input_tokens: u.prompt_tokens ?? null,
                cached_input_tokens: cached,
                output_tokens: u.completion_tokens ?? null,
                reasoning_tokens: reasoning,
                total_tokens: u.total_tokens ?? null,
                cost_usd: cost(u, cached, price),
                cost_usd_uncached: cost(u, 0, price),
                output_chars: html.length, output_words: words(plain).length,
                output_paragraphs: (html.match(/<p\b/gi) || []).length,
                // The prompt requires "Not reported" / "Unclear from the paper" whenever the
                // source lacks something — a direct measure of what an abstract leaves out.
                not_reported_mentions: (plain.match(/not reported|unclear from the (paper|study|article|abstract)/gi) || []).length,
                flesch_reading_ease: readability(plain).ease,
                flesch_kincaid_grade: readability(plain).grade,
                usage_raw: u,
            });
            const file = path.join(exDir, `${variant}${repeats > 1 ? `.r${r}` : ""}.html`);
            fs.writeFileSync(file, html);
            row.output_file = path.relative(REPO, file);
            rows.push(row);
            const outPart = reasoning ? `out ${row.output_tokens} (${reasoning} hidden reasoning + ${row.output_tokens - reasoning} visible)` : `out ${row.output_tokens}`;
            console.log(`in ${row.input_tokens} (cached ${cached}) · ${outPart} · ${fmtCost(row.cost_usd)} · ${row.output_words} words · FK ${row.flesch_kincaid_grade} · ${row.seconds}s`);
        }
    }
    console.log("");
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

const report = { generated_at: new Date().toISOString(), model, tenant: tenant.shortName, repeats, scaffold_tokens_local: scaffoldTokens, prices_usd_per_1m: price, rows };
fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(outDir, "report.md"), markdownReport(report));
if (!args["dry-run"]) fs.writeFileSync(path.join(outDir, "preview.html"), previewPage(report, outDir));

console.log(markdownReport(report));
console.log(`files: ${path.relative(REPO, outDir)}/report.md, report.json${args["dry-run"] ? "" : ", preview.html (open in a browser to judge readability side by side)"}`);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseArgs(argv) {
    const out = {};
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (!a.startsWith("--")) continue;
        const [k, inline] = a.slice(2).split("=");
        if (inline !== undefined) out[k] = inline;
        else if (argv[i + 1] && !argv[i + 1].startsWith("--")) out[k] = argv[++i];
        else out[k] = true;
    }
    return out;
}

function loadEnv(file) {
    if (!fs.existsSync(file)) return;
    for (const line of fs.readFileSync(file, "utf8").split("\n")) {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*(#.*)?$/);
        if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
    }
}

function loadExamples(dir, only) {
    if (!fs.existsSync(dir)) return [];
    const names = fs.readdirSync(dir).filter((n) => fs.statSync(path.join(dir, n)).isDirectory());
    const out = [];
    for (const name of names) {
        if (only && name !== only) continue;
        const folder = path.join(dir, name);
        const find = (base) => fs.readdirSync(folder).find((f) => f.replace(/\.[^.]+$/, "") === base);
        const abstract = find("abstract"), full = find("full");
        if (!abstract || !full) {
            console.warn(`skipping ${name}: needs both abstract.* and full.* (found ${abstract || "-"}, ${full || "-"})`);
            continue;
        }
        out.push({ name, read: (variant) => readDocument(path.join(folder, variant === "abstract" ? abstract : full)) });
    }
    return out;
}

async function readDocument(file) {
    const ext = path.extname(file).toLowerCase();
    if (ext === ".pdf") {
        const pdfParse = require("pdf-parse");
        // Exactly what production sends: api/pdfToText returns pdf-parse's text and
        // the Add form passes it on unchanged (no trim).
        return (await pdfParse(fs.readFileSync(file))).text;
    }
    if (ext === ".docx") {
        const mammoth = require("mammoth");
        return (await mammoth.extractRawText({ buffer: fs.readFileSync(file) })).value.trim();
    }
    const raw = fs.readFileSync(file, "utf8");
    return (ext === ".html" || ext === ".htm" ? stripHtml(raw) : raw).trim();
}

/** Chat-format token count: each message carries a few framing tokens. */
function countMessages(messages) {
    return messages.reduce((n, m) => n + 4 + encode(m.content || "").length, 3);
}

function cost(u, cached, p) {
    if (p.input == null || p.output == null) return null;
    const input = (u.prompt_tokens || 0) - cached;
    return round((input * p.input + cached * (p.cached ?? p.input) + (u.completion_tokens || 0) * p.output) / 1e6, 5);
}

function stripHtml(html) {
    return String(html).replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
}
// Plain function declarations: they are used above, at top level, before this point.
function words(t) { return String(t).split(/\s+/).filter(Boolean); }
function num(v) { return v === undefined || v === true ? undefined : Number(v); }
function round(x, d) { return x == null ? null : Math.round(x * 10 ** d) / 10 ** d; }
function fmtCost(c) { return c == null ? "cost n/a" : `$${c.toFixed(4)}`; }

/** Flesch reading ease / Flesch–Kincaid grade with a vowel-group syllable heuristic. */
function readability(text) {
    const w = words(text).map((x) => x.replace(/[^A-Za-z']/g, "")).filter(Boolean);
    const sentences = Math.max(1, (text.match(/[.!?]+(\s|$)/g) || []).length);
    const syllables = w.reduce((n, x) => n + Math.max(1, (x.toLowerCase().replace(/e$/, "").match(/[aeiouy]+/g) || []).length), 0);
    if (w.length === 0) return { ease: null, grade: null };
    const wps = w.length / sentences, spw = syllables / w.length;
    return { ease: round(206.835 - 1.015 * wps - 84.6 * spw, 1), grade: round(0.39 * wps + 11.8 * spw - 15.59, 1) };
}

function markdownReport({ model, tenant, repeats, scaffold_tokens_local, prices_usd_per_1m, rows }) {
    const L = [];
    L.push(`# Token study — ${model} (tenant ${tenant}${repeats > 1 ? `, ${repeats} runs each` : ""})`, "");
    L.push(`Fixed prompt scaffolding on every call: **~${scaffold_tokens_local} tokens** (system instruction + example output HTML/CSS). Prices used (USD/1M): input ${prices_usd_per_1m.input ?? "?"}, cached ${prices_usd_per_1m.cached ?? "?"}, output ${prices_usd_per_1m.output ?? "?"} — verify at openai.com/api/pricing.`, "");
    L.push("| example | variant | article tok (local) | input tok (API) | cached | output tok (incl. hidden) | hidden reasoning | total | cost | cost if uncached | out words | ¶ | \"not reported\" | FK grade | s |");
    L.push("|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|");
    for (const r of rows) {
        const v = r.run > 1 ? `${r.variant} #${r.run}` : r.variant;
        if (r.error) { L.push(`| ${r.example} | ${v} | ${r.article_tokens_local} | — | — | — | — | — | — | — | — | — | — | FAILED: ${r.error} |`); continue; }
        if (r.input_tokens == null) { L.push(`| ${r.example} | ${v} | ${r.article_tokens_local} | (dry run ≈ ${r.input_tokens_local}) | | | | | | | | | | |`); continue; }
        L.push(`| ${r.example} | ${v} | ${r.article_tokens_local} | ${r.input_tokens} | ${r.cached_input_tokens} | ${r.output_tokens} | ${r.reasoning_tokens} | ${r.total_tokens} | ${fmtCost(r.cost_usd)} | ${fmtCost(r.cost_usd_uncached)} | ${r.output_words} | ${r.output_paragraphs} | ${r.not_reported_mentions} | ${r.flesch_kincaid_grade ?? ""} | ${r.seconds} |`);
    }
    // per-example comparison
    const byEx = new Map();
    for (const r of rows) { if (r.input_tokens == null) continue; const e = byEx.get(r.example) || {}; (e[r.variant] ||= []).push(r); byEx.set(r.example, e); }
    if (byEx.size) {
        L.push("", "## Full paper vs. abstract", "", "| example | input tokens | output tokens | cost (uncached) | out words | \"not reported\" | FK grade |", "|---|---:|---:|---:|---:|---:|---:|");
        const avg = (xs, k) => xs.reduce((n, x) => n + (x[k] || 0), 0) / xs.length;
        const totals = { ai: 0, fi: 0, ao: 0, fo: 0, ac: 0, fc: 0 };
        for (const [name, e] of byEx) {
            if (!e.abstract || !e.full) continue;
            const a = e.abstract, f = e.full;
            const ratio = (x, y) => (y ? `${round(x / y, 2)}×` : "—");
            L.push(`| ${name} | ${round(avg(a, "input_tokens"), 0)} → ${round(avg(f, "input_tokens"), 0)} (${ratio(avg(f, "input_tokens"), avg(a, "input_tokens"))}) | ${round(avg(a, "output_tokens"), 0)} → ${round(avg(f, "output_tokens"), 0)} (${ratio(avg(f, "output_tokens"), avg(a, "output_tokens"))}) | ${fmtCost(avg(a, "cost_usd_uncached"))} → ${fmtCost(avg(f, "cost_usd_uncached"))} | ${round(avg(a, "output_words"), 0)} → ${round(avg(f, "output_words"), 0)} | ${round(avg(a, "not_reported_mentions"), 1)} → ${round(avg(f, "not_reported_mentions"), 1)} | ${round(avg(a, "flesch_kincaid_grade"), 1)} → ${round(avg(f, "flesch_kincaid_grade"), 1)} |`);
            totals.ai += avg(a, "input_tokens"); totals.fi += avg(f, "input_tokens"); totals.ao += avg(a, "output_tokens"); totals.fo += avg(f, "output_tokens"); totals.ac += avg(a, "cost_usd_uncached"); totals.fc += avg(f, "cost_usd_uncached");
        }
        L.push(`| **all** | ${round(totals.ai, 0)} → ${round(totals.fi, 0)} | ${round(totals.ao, 0)} → ${round(totals.fo, 0)} | ${fmtCost(totals.ac)} → ${fmtCost(totals.fc)} | | |`);
    }
    L.push("", "Readability: judge the outputs yourself in preview.html; the Flesch–Kincaid grade is a rough automatic hint only (production targets ≈ 8th grade).", "");
    return L.join("\n");
}

function previewPage(report, dir) {
    const css = fs.existsSync(path.join(REPO, "public/assets/example-css.css")) ? fs.readFileSync(path.join(REPO, "public/assets/example-css.css"), "utf8") : "";
    const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
    const byEx = new Map();
    for (const r of report.rows) { if (!r.output_file) continue; const e = byEx.get(r.example) || {}; (e[r.variant] ||= []).push(r); byEx.set(r.example, e); }
    const col = (r) => `<section class="col"><header><h3>${esc(r.variant)}${r.run > 1 ? ` #${r.run}` : ""}</h3><p class="meta">in ${r.input_tokens} tok (cached ${r.cached_input_tokens}) · out ${r.output_tokens} tok · ${fmtCost(r.cost_usd)} · ${r.output_words} words · "not reported" ×${r.not_reported_mentions} · FK ${r.flesch_kincaid_grade}</p></header><div class="out">${fs.readFileSync(path.join(REPO, r.output_file), "utf8")}</div></section>`;
    // One column per variant (run #1) keeps it readable; extra runs stay on disk as <variant>.rN.html.
    const extra = report.repeats > 1 ? `<p class="meta">Showing run 1 of ${report.repeats}; the other runs are in this folder as abstract.rN.html / full.rN.html.</p>` : "";
    const blocks = [...byEx].map(([name, e]) => `<article class="example"><h2>${esc(name)}</h2>${extra}<div class="cols">${[...(e.abstract || []), ...(e.full || [])].filter((r) => r.run === 1).map(col).join("")}</div></article>`).join("");
    return `<!doctype html><meta charset="utf-8"><title>Token study ${esc(report.model)} — ${esc(path.basename(dir))}</title>
<style>${css}
body{font-family:system-ui,sans-serif;margin:0;background:#f6f7f8;color:#111} .page{max-width:1500px;margin:0 auto;padding:24px}
.example{background:#fff;border:1px solid #e3e5e8;border-radius:12px;padding:20px;margin:0 0 28px} .example>h2{margin:0 0 14px;font-size:20px}
.cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:18px} .col{border:1px solid #e3e5e8;border-radius:10px;padding:14px;background:#fafbfc}
.out h1{font-size:24px!important;line-height:1.25!important;margin:0 0 12px!important} .out h2{font-size:18px!important}
.col header h3{margin:0;font-size:15px;text-transform:capitalize} .meta{margin:4px 0 12px;font-size:12px;color:#555} .out{background:#fff;padding:12px;border-radius:8px;border:1px solid #eceef1;font-size:15px;line-height:1.55}
</style><div class="page"><h1 style="font-size:22px">Token study — ${esc(report.model)} <small style="font-weight:normal;color:#555">tenant ${esc(report.tenant)} · ${esc(report.generated_at.slice(0, 16).replace("T", " "))}</small></h1><p style="color:#555">Left: from the abstract. Right: from the full paper. Same prompt, same model.</p>${blocks}</div>`;
}
