#!/usr/bin/env node
/**
 * Simplify eval: run the PRODUCTION article-simplification prompt on several
 * models and compare what matters before switching models:
 *
 *   runtime      wall-clock seconds, streamed exactly like production
 *   formatting   every rule the prompt sets (wrapper div, classed h1/h2/p,
 *                allowed highlight spans, no stray tags/classes, no fences)
 *   editor       the output pushed through the editor's own document model and
 *                the server sanitizer (scripts/richtext-roundtrip.mjs) — any
 *                text, structure or apicss-class loss is flagged
 *   grounding    numbers in the summary that don't appear in the source paper
 *                (a cheap, objective hallucination signal; review the list)
 *   cost         from the API's reported usage and current list prices
 *
 * The prompt is imported from src/utils/apiHelpers.js (buildSimplifyRequest),
 * not copied, so every model sees exactly what production sends.
 *
 * Inputs: the token-study example folders —
 *   scripts/token-study/examples/<name>/full.(pdf|docx|txt|md|html)
 *   scripts/token-study/examples/<name>/abstract.(…)        (optional)
 *   scripts/token-study/examples/<name>/meta.json           (optional)
 *       { "published_article_id": 349 }  → shows the live NF version alongside
 *
 * Usage:
 *   npm run simplify-eval -- --models gpt-4.1-mini,gpt-6-luna:none,gpt-6.1-sol:low
 *   npm run simplify-eval -- --models … --variant both          # full papers + abstracts
 *   npm run simplify-eval -- --judge gpt-6-astra:low --from scripts/simplify-eval/results/<run>
 *        LLM check of every saved output against its source for unsupported claims
 *   npm run simplify-eval -- --create-pending --model gpt-6.1-sol:low --assign 5 \
 *        --title "Simplify Test" [--tenant NF] [--yes]
 *        Simplify each full paper with that model and add it to the tenant's
 *        review queue (pending_article), assigned to email_credentials.id 5,
 *        exactly as /api/articles/add would. Without --yes it only prints the plan.
 *
 * model[:effort] — effort is the reasoning level for reasoning models
 * (gpt-5*, gpt-6*: none|low|medium|high; gpt-6.1-sol's lowest is low).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { register, createRequire } from "node:module";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "../..");
const require = createRequire(path.join(REPO, "package.json"));
const args = parseArgs(process.argv.slice(2));
if (args.help) {
    console.log(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("*/")[0].replace(/^#!.*\n\/\*\*\n/, "").replace(/^ \* ?/gm, ""));
    process.exit(0);
}

process.chdir(REPO); // apiHelpers reads public/assets/example-output.html relative to cwd
loadEnv(path.join(REPO, ".env"));
if (args.tenant) process.env.NEXT_PUBLIC_SITE_KEY = args.tenant;
if (!process.env.NEXT_PUBLIC_SITE_KEY) process.env.NEXT_PUBLIC_SITE_KEY = "NF"; // the tenant changes the prompt
if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is not set (.env or environment).");
    process.exit(1);
}

register("../token-study/alias-hooks.mjs", import.meta.url);
const { buildSimplifyRequest, cleanSimplifiedHtml, summarizeArticle, SIMPLIFY_MODEL, SIMPLIFY_REASONING_EFFORT } = await import("../../src/utils/apiHelpers.js");
const { sanitizeRichText } = await import("../../src/lib/richText.js");
const { tenant } = await import("../../src/lib/config.js");
const { analyze } = await import("../richtext-roundtrip.mjs");
const { default: openai } = await import("../../src/lib/openai.js");

const EXAMPLES = path.resolve(args.examples || path.join(REPO, "scripts/token-study/examples"));
const TENANT_KEY = String(process.env.NEXT_PUBLIC_SITE_KEY).toUpperCase();

// USD per 1M tokens, standard tier (≤272K context). Source:
// developers.openai.com/api/docs/pricing, checked 2026-10-11 — re-check before quoting.
const PRICES = {
    "gpt-4.1-mini": [0.4, 0.1, 1.6], "gpt-4.1": [2.0, 0.5, 8.0],
    "gpt-6-astra": [10.0, 1.0, 50.0], "gpt-6.1-sol": [2.0, 0.1, 10.0], "gpt-6-sol": [2.0, 0.2, 10.0], "gpt-6-luna": [0.1, 0.01, 0.5],
    "gpt-5.6-sol": [4.0, 0.4, 20.0], "gpt-5.6-terra": [2.0, 0.2, 12.0], "gpt-5.6-luna": [0.2, 0.02, 1.2],
    "gpt-5.5": [5.0, 0.5, 30.0], "gpt-5.4": [2.5, 0.25, 15.0], "gpt-5.4-mini": [0.75, 0.075, 4.5], "gpt-5.4-nano": [0.2, 0.02, 1.25],
    "gpt-5.2": [1.75, 0.175, 14.0], "gpt-5.1": [1.25, 0.125, 10.0], "gpt-5": [1.25, 0.125, 10.0], "gpt-5-mini": [0.25, 0.025, 2.0],
};

// (Dispatch is at the bottom of the file, after every constant it relies on.)

// ===========================================================================
// 1. Eval: models × examples × variants
// ===========================================================================

async function evalRun() {
    const configs = parseConfigs(args.models || `${SIMPLIFY_MODEL}${SIMPLIFY_REASONING_EFFORT ? ":" + SIMPLIFY_REASONING_EFFORT : ""}`);
    const variants = args.variant === "both" ? ["full", "abstract"] : [args.variant || "full"];
    const examples = loadExamples();
    const outDir = newResultsDir();
    console.log(`simplify eval — tenant ${tenant.shortName}, ${configs.length} model config(s) × ${examples.length} paper(s) × ${variants.join("+")}`);
    console.log(`results → ${path.relative(REPO, outDir)}\n`);

    // Sources once; published (live) versions once.
    const sources = {};
    for (const ex of examples) for (const v of variants) if (ex.files[v]) sources[`${ex.name}/${v}`] = await readDocument(ex.files[v]);
    const live = await loadLiveVersions(examples);
    const liveChecks = {};
    for (const [name, a] of Object.entries(live)) if (sources[`${name}/full`]) liveChecks[name] = assess(a.innertext, sources[`${name}/full`]);

    // Configs run in parallel; within a config, calls are sequential so each
    // timing is a single, uncontended request like an editor's upload.
    const rows = (await Promise.all(configs.map(async (cfg) => {
        const out = [];
        for (const ex of examples) for (const variant of variants) {
            const source = sources[`${ex.name}/${variant}`];
            if (source == null) continue;
            const row = { example: ex.name, variant, model: cfg.model, effort: cfg.effort || null, label: cfg.label };
            try {
                const res = await simplify(source, cfg);
                Object.assign(row, res.metrics);
                const dir = path.join(outDir, ex.name);
                fs.mkdirSync(dir, { recursive: true });
                const file = path.join(dir, `${variant}.${slug(cfg.label)}.html`);
                fs.writeFileSync(file, res.html);
                row.output_file = path.relative(REPO, file);
                Object.assign(row, assess(res.html, source));
                console.log(`  ${cfg.label.padEnd(18)} ${`${ex.name}/${variant}`.padEnd(18)} ${String(row.seconds).padStart(5)}s (first text ${row.ttft_seconds}s) · in ${row.input_tokens} · out ${row.output_tokens}${row.reasoning_tokens ? ` (${row.reasoning_tokens} hidden)` : ""} · ${fmtCost(row.cost_usd)} · format issues ${row.format_issues.length} · editor flags ${row.editor_flags.length} · ungrounded #s ${row.ungrounded_numbers.length}`);
            } catch (err) {
                row.error = String(err?.message || err);
                console.log(`  ${cfg.label.padEnd(18)} ${`${ex.name}/${variant}`.padEnd(18)} FAILED: ${row.error.slice(0, 120)}`);
            }
            out.push(row);
        }
        return out;
    }))).flat();

    const report = { generated_at: new Date().toISOString(), tenant: tenant.shortName, configs, variants, examples: examples.map((e) => e.name), live: Object.fromEntries(Object.entries(live).map(([k, v]) => [k, { id: v.id, title: v.title, checks: liveChecks[k] }])), rows };
    fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
    fs.writeFileSync(path.join(outDir, "report.md"), evalMarkdown(report));
    fs.writeFileSync(path.join(outDir, "preview.html"), previewPage(report, live));
    console.log("\n" + evalMarkdown(report));
    console.log(`files: ${path.relative(REPO, outDir)}/report.md, report.json, preview.html`);
}

/** One production-identical simplification, streamed and timed. */
async function simplify(source, cfg) {
    const request = buildSimplifyRequest(source, { model: cfg.model, reasoningEffort: cfg.effort || null });
    const r = await streamWithRetry(request);
    const html = cleanSimplifiedHtml(r.text);
    const u = r.usage || {};
    const cached = u.prompt_tokens_details?.cached_tokens || 0;
    const reasoning = u.completion_tokens_details?.reasoning_tokens || 0;
    return {
        html,
        metrics: {
            model_used: r.modelUsed, finish_reason: r.finish,
            seconds: round(r.totalSec, 1), ttft_seconds: round(r.ttftSec, 1),
            input_tokens: u.prompt_tokens ?? null, cached_input_tokens: cached,
            output_tokens: u.completion_tokens ?? null, reasoning_tokens: reasoning,
            cost_usd: cost(cfg.model, u, 0), // uncached: a single upload rarely hits the cache
            usage_raw: u,
        },
    };
}

async function streamWithRetry(request, attempt = 1) {
    const t0 = performance.now();
    let first = null, text = "", usage = null, finish = null, modelUsed = null;
    try {
        const stream = await openai.chat.completions.create({ ...request, stream: true, stream_options: { include_usage: true } });
        for await (const chunk of stream) {
            if (chunk.model) modelUsed = chunk.model;
            const d = chunk.choices?.[0]?.delta?.content;
            if (d) { if (first === null) first = performance.now(); text += d; }
            if (chunk.choices?.[0]?.finish_reason) finish = chunk.choices[0].finish_reason;
            if (chunk.usage) usage = chunk.usage;
        }
    } catch (err) {
        const retriable = err?.status === 429 || (err?.status >= 500 && err?.status < 600) || /ECONNRESET|ETIMEDOUT|socket/i.test(String(err?.message));
        if (retriable && attempt < 3) {
            await new Promise((r) => setTimeout(r, 4000 * attempt));
            return streamWithRetry(request, attempt + 1);
        }
        throw err;
    }
    const end = performance.now();
    return { text, usage, finish, modelUsed, totalSec: (end - t0) / 1000, ttftSec: ((first ?? end) - t0) / 1000 };
}

// ===========================================================================
// Assessment: formatting, editor round-trip, grounding, readability
// ===========================================================================

function assess(html, source) {
    const plain = stripHtml(html);
    const editor = analyze(html);
    const editor_flags = Object.entries(editor.flags)
        .filter(([k, v]) => v && ["text_loss", "structure_loss", "apicss_loss", "sanitizer_not_fixed_point", "sanitizer_text_disagrees", "links_lost"].includes(k))
        .map(([k]) => `${k}${editor.details[k] ? `: ${String(editor.details[k]).split("\n")[0].slice(0, 120)}` : ""}`);
    const fmt = checkFormat(html);
    const rd = readability(plain);
    return {
        format_issues: fmt.issues,
        structure: fmt.counts,
        highlight_spans: fmt.spanTypes,
        editor_flags,
        ungrounded_numbers: ungroundedNumbers(plain, source),
        words: words(plain).length,
        flesch_kincaid_grade: rd.grade,
        flesch_reading_ease: rd.ease,
    };
}

const SPAN_CLASSES = new Set(["apicss-text-primary", "apicss-text-secondary", "apicss-text-success", "apicss-text-warning", "apicss-text-info", "apicss-strong"]);
const EXPECTED_TAGS = new Set(["div", "h1", "h2", "h3", "p", "span", "strong", "em", "b", "i", "u", "ul", "ol", "li", "a", "br", "sub", "sup"]);

/** Every rule the production prompt sets for the HTML. */
function checkFormat(html) {
    const issues = [];
    const t = html.trim();
    if (!/^<div class="apicss-body">/.test(t)) issues.push('not wrapped in <div class="apicss-body">');
    if (!/<\/div>\s*$/.test(t)) issues.push("wrapper not closed at the end");
    const tags = [...t.matchAll(/<([a-z][a-z0-9]*)\b([^>]*)>/gi)].map((m) => {
        const cls = (m[2].match(/\bclass\s*=\s*"([^"]*)"/i) || [])[1] || "";
        return { tag: m[1].toLowerCase(), classes: cls.split(/\s+/).filter(Boolean) };
    });
    const by = (tag) => tags.filter((x) => x.tag === tag);
    const has = (x, c) => x.classes.includes(c);
    const h1 = by("h1");
    if (h1.length !== 1) issues.push(`${h1.length} <h1> (expected exactly 1)`);
    if (h1.some((x) => !has(x, "apicss-heading-primary"))) issues.push("<h1> without apicss-heading-primary");
    const bad = (list, cls, label) => { const n = list.filter((x) => !has(x, cls)).length; if (n) issues.push(`${n} ${label} without ${cls}`); };
    bad(by("h2"), "apicss-heading-secondary", "<h2>");
    bad(by("p"), "apicss-paragraph", "<p>");
    const plainStrong = [...by("strong"), ...by("b")].filter((x) => x.classes.length === 0).length;
    if (plainStrong) issues.push(`${plainStrong} plain <strong>/<b> (prompt: never without a class)`);
    const badSpans = by("span").filter((x) => x.classes.length === 0 || x.classes.some((c) => !SPAN_CLASSES.has(c))).length;
    if (badSpans) issues.push(`${badSpans} <span> with missing/unknown classes`);
    if (by("div").length > 1) issues.push(`${by("div").length - 1} extra <div> inside the wrapper`);
    const odd = [...new Set(tags.map((x) => x.tag).filter((x) => !EXPECTED_TAGS.has(x)))];
    if (odd.length) issues.push(`unexpected tags: ${odd.join(", ")}`);
    const foreign = [...new Set(tags.flatMap((x) => x.classes).filter((c) => !c.startsWith("apicss-")))];
    if (foreign.length) issues.push(`non-apicss classes: ${foreign.join(", ")}`);
    if (/<!doctype/i.test(t)) issues.push("DOCTYPE present");
    if (/```/.test(t)) issues.push("markdown fence present");
    if (/©/.test(t)) issues.push("© sign present");
    const spanTypes = {};
    for (const x of by("span")) for (const c of x.classes) if (c !== "apicss-strong") spanTypes[c] = (spanTypes[c] || 0) + 1;
    return { issues, counts: { h2: by("h2").length, p: by("p").length, lists: by("ul").length + by("ol").length, spans: by("span").length }, spanTypes };
}

/** Numbers >10 in the summary that never appear in the source (rounded values show up here too — review the list). */
function ungroundedNumbers(outText, source) {
    const nums = (txt) => [...String(txt).replace(/(\d),(\d{3})/g, "$1$2").replace(/(\d)\s(\d{3})\b/g, "$1$2").matchAll(/(?<![\w.])(\d+(?:\.\d+)?)(?![\w])/g)].map((m) => m[1]);
    const src = new Set(nums(source).flatMap((n) => [n, String(Number(n))]));
    const seen = new Set();
    const out = [];
    for (const n of nums(outText)) {
        if (seen.has(n)) continue;
        seen.add(n);
        const v = Number(n);
        if (Number.isInteger(v) && v <= 10) continue; // "3 groups" is often "three groups" in the paper
        if (!src.has(n) && !src.has(String(v))) out.push(n);
    }
    return out;
}

// ===========================================================================
// 2. Judge: LLM check of saved outputs against their sources
// ===========================================================================

async function judgeRun() {
    const from = path.resolve(args.from || "");
    if (!args.from || !fs.existsSync(path.join(from, "report.json"))) {
        console.error("--judge needs --from <results dir> (a previous eval run).");
        process.exit(1);
    }
    const [judgeCfg] = parseConfigs(args.judge);
    const report = JSON.parse(fs.readFileSync(path.join(from, "report.json"), "utf8"));
    const examples = Object.fromEntries(loadExamples().map((e) => [e.name, e]));
    const only = args.only ? new Set(String(args.only).split(",")) : null;
    const rows = report.rows.filter((r) => r.output_file && (!only || only.has(r.label)));
    console.log(`judging ${rows.length} output(s) from ${path.relative(REPO, from)} with ${judgeCfg.label}\n`);

    const results = [];
    for (const r of rows) {
        const source = await readDocument(examples[r.example].files[r.variant]);
        const summary = stripHtml(fs.readFileSync(path.join(REPO, r.output_file), "utf8"));
        const request = {
            model: judgeCfg.model,
            ...(judgeCfg.effort ? { reasoning_effort: judgeCfg.effort } : {}),
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: JUDGE_PROMPT },
                { role: "user", content: `SOURCE PAPER:\n"""\n${source}\n"""\n\nPATIENT SUMMARY:\n"""\n${summary}\n"""` },
            ],
        };
        let verdict = null, usage = null, error = null;
        try {
            const res = await openai.chat.completions.create(request);
            usage = res.usage;
            verdict = JSON.parse(res.choices[0].message.content);
        } catch (e) { error = String(e.message || e); }
        const claims = verdict?.unsupported_claims || [];
        const major = claims.filter((c) => c.severity === "major").length;
        results.push({ label: r.label, example: r.example, variant: r.variant, major, minor: claims.length - major, claims, error, judge_cost_usd: usage ? cost(judgeCfg.model, usage, 0) : null });
        console.log(`  ${r.label.padEnd(18)} ${`${r.example}/${r.variant}`.padEnd(18)} ${error ? `FAILED: ${error.slice(0, 100)}` : `major ${major} · minor ${claims.length - major}`}`);
    }
    const md = judgeMarkdown(results, judgeCfg);
    fs.writeFileSync(path.join(from, `judge.${slug(judgeCfg.label)}.json`), JSON.stringify(results, null, 2));
    fs.writeFileSync(path.join(from, `judge.${slug(judgeCfg.label)}.md`), md);
    console.log("\n" + md);
}

const JUDGE_PROMPT = `You check patient-friendly summaries of scientific papers for unfaithful content.
Compare the PATIENT SUMMARY against the SOURCE PAPER. List every factual claim in the summary that the paper does not support: invented or wrong numbers, findings the paper does not report, wrong study design or population, overstated certainty or benefit, wrong attributions.
Do NOT flag: plain-language rephrasing, reasonable rounding, definitions of medical terms, or brief general background that is common medical knowledge.
Severity: "major" if it would mislead a patient about the study's results, risks, or design; otherwise "minor".
Respond with JSON only: {"unsupported_claims":[{"claim":"<quote or close paraphrase from the summary>","why":"<what the paper actually says>","severity":"major"|"minor"}]}. Use an empty list if everything is supported.`;

// ===========================================================================
// 3. Create pending articles in a tenant's review queue
// ===========================================================================

async function createPending() {
    const [cfg] = parseConfigs(args.model || "");
    if (!cfg) { console.error("--create-pending needs --model <model[:effort]>"); process.exit(1); }
    const assignTo = Number(args.assign);
    const titleBase = String(args.title || "Simplify Test");
    const write = !!args.yes;
    const { Pool } = require("pg");
    const tenants = parseEnvFile(path.resolve(REPO, "..", "..", "..", ".env.tenants"), path.join(REPO, ".env.tenants"));
    const host = tenants[TENANT_KEY];
    if (!host) { console.error(`No host for tenant ${TENANT_KEY} in .env.tenants`); process.exit(1); }
    const pool = new Pool({ host, user: process.env.PGUSER, password: process.env.PGPASSWORD, database: process.env.PGDATABASE, port: 5432, max: 2, ssl: { rejectUnauthorized: false, require: true } });

    const assignee = assignTo ? (await pool.query(`SELECT id, first_name, last_name, email FROM email_credentials WHERE id = $1`, [assignTo])).rows[0] : null;
    if (assignTo && !assignee) { console.error(`email_credentials.id ${assignTo} not found on ${TENANT_KEY}`); process.exit(1); }
    const examples = loadExamples().filter((e) => e.files.full);
    const outDir = newResultsDir("pending");
    console.log(`create pending — tenant ${TENANT_KEY} (${host.split(".")[0]}), model ${cfg.label}, ${examples.length} paper(s), assign → ${assignee ? `#${assignee.id} ${assignee.first_name} ${assignee.last_name} <${assignee.email}>` : "nobody"}${write ? "" : "  [PLAN ONLY — add --yes to write]"}\n`);

    const created = [];
    let i = 0;
    for (const ex of examples) {
        i++;
        const title = `${titleBase} ${i} (${cfg.model})`;
        const meta = ex.meta.published_article_id ? (await pool.query(`SELECT id, title, tags, authors, article_link, publication_date, source_publication FROM article WHERE id = $1`, [ex.meta.published_article_id])).rows[0] : null;
        const dupe = (await pool.query(`SELECT id FROM pending_article WHERE title = $1`, [title])).rows[0];
        if (dupe) { console.log(`  ${title}: already exists (pending #${dupe.id}) — skipped`); created.push({ title, skipped: true, pending_id: dupe.id }); continue; }
        if (!write) { console.log(`  would create "${title}" from ${ex.name} (copying metadata from article #${meta?.id ?? "—"} "${meta?.title?.slice(0, 50) ?? ""}")`); continue; }

        const source = await readDocument(ex.files.full);
        const t0 = performance.now();
        const res = await simplify(source, cfg);
        const tSimplify = (performance.now() - t0) / 1000;
        const t1 = performance.now();
        const summary = await summarizeArticle(source); // production teaser (unchanged model)
        const tSummary = (performance.now() - t1) / 1000;
        const checks = assess(res.html, source);

        await pool.query("BEGIN");
        try {
            const ins = await pool.query(
                `INSERT INTO pending_article (title, tags, innertext, summary, article_link, publisher, image_url, authors, publication_date, source_publication, image_credit, additional_editors)
                 VALUES ($1, $2, $3, $4, $5, NULL, NULL, $6, $7, $8, NULL, '{}') RETURNING id`,
                [title, meta?.tags || [], sanitizeRichText(res.html), sanitizeRichText(summary), meta?.article_link || null, meta?.authors || [], meta?.publication_date || null, meta?.source_publication || null]
            );
            const id = ins.rows[0].id;
            if (assignee) await pool.query(`INSERT INTO article_assignments (editor_id, article_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [assignee.id, id]);
            await pool.query("COMMIT");
            const html = path.join(outDir, `${slug(title)}.html`);
            fs.writeFileSync(html, res.html);
            created.push({ title, pending_id: id, example: ex.name, from_article: meta?.id ?? null, simplify_seconds: round(tSimplify, 1), ttft_seconds: res.metrics.ttft_seconds, summary_seconds: round(tSummary, 1), ...res.metrics, ...checks, output_file: path.relative(REPO, html) });
            console.log(`  ✓ pending #${id} "${title}" — simplify ${round(tSimplify, 1)}s (first text ${res.metrics.ttft_seconds}s) + teaser ${round(tSummary, 1)}s · format issues ${checks.format_issues.length} · editor flags ${checks.editor_flags.length}`);
        } catch (e) {
            await pool.query("ROLLBACK");
            throw e;
        }
    }
    await pool.end();
    if (write) {
        fs.writeFileSync(path.join(outDir, "created.json"), JSON.stringify({ tenant: TENANT_KEY, model: cfg, assignee, created }, null, 2));
        console.log(`\nrecord: ${path.relative(REPO, outDir)}/created.json`);
    }
}

// ===========================================================================
// Reports
// ===========================================================================

function evalMarkdown({ tenant: t, configs, variants, rows, live = {} }) {
    const L = [`# Simplify eval — tenant ${t}`, "", "Runtime is wall-clock for one streamed request (what an editor waits for on upload). Cost is per article, uncached, at list price.", ""];
    const lv = Object.entries(live).filter(([, v]) => v.checks);
    if (lv.length) {
        L.push(`Live ${t} versions of the same papers, checked the same way: ${lv.map(([k, v]) => `${k} (#${v.id}): ${v.checks.format_issues.length} format issue(s), ${v.checks.editor_flags.length} editor flag(s)`).join("; ")}.`, "");
    }
    for (const variant of variants) {
        L.push(`## ${variant === "full" ? "Full papers" : "Abstracts"}`, "", "| model | avg s | max s | first text s | in tok | out tok (hidden) | cost/article | format issues | editor flags | numbers not in source | words | FK grade |", "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|");
        for (const c of configs) {
            const rs = rows.filter((r) => r.label === c.label && r.variant === variant && !r.error);
            const failed = rows.filter((r) => r.label === c.label && r.variant === variant && r.error).length;
            if (!rs.length) { L.push(`| ${c.label} | — | | | | | | | | | | ${failed ? `${failed} failed` : ""} |`); continue; }
            const avg = (k) => rs.reduce((n, r) => n + (r[k] || 0), 0) / rs.length;
            const sum = (f) => rs.reduce((n, r) => n + f(r), 0);
            L.push(`| ${c.label}${failed ? ` (${failed} failed)` : ""} | ${round(avg("seconds"), 1)} | ${round(Math.max(...rs.map((r) => r.seconds)), 1)} | ${round(avg("ttft_seconds"), 1)} | ${round(avg("input_tokens"), 0)} | ${round(avg("output_tokens"), 0)} (${round(avg("reasoning_tokens"), 0)}) | ${fmtCost(avg("cost_usd"))} | ${sum((r) => r.format_issues.length)} | ${sum((r) => r.editor_flags.length)} | ${sum((r) => r.ungrounded_numbers.length)} | ${round(avg("words"), 0)} | ${round(avg("flesch_kincaid_grade"), 1)} |`);
        }
        L.push("");
    }
    L.push("## Details", "");
    for (const r of rows) {
        if (r.error) { L.push(`- **${r.label}** · ${r.example}/${r.variant}: FAILED — ${r.error}`); continue; }
        const bits = [];
        if (r.format_issues.length) bits.push(`format: ${r.format_issues.join("; ")}`);
        if (r.editor_flags.length) bits.push(`editor: ${r.editor_flags.join("; ")}`);
        if (r.ungrounded_numbers.length) bits.push(`numbers not in source: ${r.ungrounded_numbers.join(", ")}`);
        if (r.finish_reason && r.finish_reason !== "stop") bits.push(`finish_reason: ${r.finish_reason}`);
        L.push(`- **${r.label}** · ${r.example}/${r.variant} — ${r.seconds}s, ${r.structure.h2} sections, ${r.structure.p} paragraphs, highlights ${JSON.stringify(r.highlight_spans)}${bits.length ? ` — ${bits.join(" · ")}` : " — clean"}`);
    }
    return L.join("\n") + "\n";
}

function judgeMarkdown(results, cfg) {
    const L = [`# Faithfulness check — judged by ${cfg.label}`, "", "| model | outputs | major | minor | judge cost |", "|---|---:|---:|---:|---:|"];
    const labels = [...new Set(results.map((r) => r.label))];
    for (const l of labels) {
        const rs = results.filter((r) => r.label === l && !r.error);
        L.push(`| ${l} | ${rs.length} | ${rs.reduce((n, r) => n + r.major, 0)} | ${rs.reduce((n, r) => n + r.minor, 0)} | ${fmtCost(rs.reduce((n, r) => n + (r.judge_cost_usd || 0), 0))} |`);
    }
    L.push("", "## Flagged claims", "");
    for (const r of results) for (const c of r.claims) L.push(`- **${r.label}** · ${r.example}/${r.variant} · ${c.severity}: “${c.claim}” — ${c.why}`);
    return L.join("\n") + "\n";
}

/** Outputs side by side, rendered with the article page's real CSS. */
function previewPage(report, live) {
    const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
    let siteCss = "";
    try {
        const sass = require("sass");
        siteCss = [
            fs.readFileSync(path.join(REPO, "node_modules/tailwindcss/src/css/preflight.css"), "utf8").replace(/theme\([^)]*\)/g, "inherit"),
            "html{font-size:10px} body{font-family:Outfit,system-ui,sans-serif;font-size:1.6rem;color:#0b1618}",
            sass.compile(path.join(REPO, "src/app/(public)/articles/[id]/ArticlePage.scss"), { loadPaths: [path.join(REPO, "src")], silenceDeprecations: ["import", "global-builtin", "legacy-js-api"] }).css,
        ].join("\n");
    } catch (e) {
        siteCss = `/* could not compile ArticlePage.scss: ${String(e.message).slice(0, 200)} */`;
    }
    const col = (head, meta, html) => `<section class="col"><header><h3>${head}</h3><p class="meta">${meta}</p></header><div class="article-page"><div class="article-page__content-text apicss-body">${html}</div></div></section>`;
    const blocks = [];
    for (const name of report.examples) for (const variant of report.variants) {
        const cols = [];
        if (variant === "full" && live[name]) {
            const lc = report.live[name]?.checks;
            const lflags = lc ? lc.format_issues.length + lc.editor_flags.length : null;
            cols.push(col(`Live on ${report.tenant} now`, `article #${live[name].id} — as published (may be editor-edited)${lc ? ` · ${lflags ? `<b style="color:#b45309">${lflags} format/editor flag(s)</b>` : "format ✓ editor ✓"}` : ""}`, live[name].innertext));
        }
        for (const c of report.configs) {
            const r = report.rows.find((x) => x.example === name && x.variant === variant && x.label === c.label);
            if (!r) continue;
            if (r.error) { cols.push(col(esc(c.label), "failed", `<p>${esc(r.error)}</p>`)); continue; }
            const flags = r.format_issues.length + r.editor_flags.length;
            cols.push(col(esc(c.label), `${r.seconds}s · ${r.words} words · ${fmtCost(r.cost_usd)} · ${flags ? `<b style="color:#b45309">${flags} format/editor flag(s)</b>` : "format ✓ editor ✓"} · ${r.ungrounded_numbers.length} number(s) not in source`, fs.readFileSync(path.join(REPO, r.output_file), "utf8")));
        }
        blocks.push(`<article class="example"><h2>${esc(name)} — ${variant === "full" ? "from the full paper" : "from the abstract"}</h2><div class="cols">${cols.join("")}</div></article>`);
    }
    return `<!doctype html><meta charset="utf-8"><title>Simplify eval — ${esc(report.generated_at.slice(0, 16))}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>${siteCss}
.page{max-width:2000px;margin:0 auto;padding:2.4rem} .page>h1{font-size:2.4rem;font-weight:600;margin-bottom:.6rem} .lead{color:#555;margin-bottom:2rem}
.example{background:#fff;border:1px solid #e3e5e8;border-radius:12px;padding:2rem;margin:0 0 2.8rem} .example>h2{font-size:2rem;font-weight:600;margin:0 0 1.4rem}
.cols{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(380px,1fr);gap:1.6rem;overflow-x:auto;padding-bottom:.8rem}
.col{border:1px solid #e3e5e8;border-radius:10px;padding:1.4rem;background:#fafbfc;min-width:0} .col header h3{font-size:1.5rem;font-weight:600} .meta{font-size:1.2rem;color:#555;margin:.4rem 0 1.2rem}
.col .article-page{display:block;padding:0;margin:0;background:#fff;border:1px solid #eceef1;border-radius:8px} .col .article-page__content-text{margin:0;padding:1.4rem;max-width:none}
</style><div class="page"><h1>Simplify eval</h1><p class="lead">Same production prompt for every model. Rendered with the article page's CSS. ${esc(report.tenant)} · ${esc(report.generated_at.slice(0, 16).replace("T", " "))}</p>${blocks.join("")}</div>`;
}

// ===========================================================================
// Helpers
// ===========================================================================

function parseConfigs(spec) {
    return String(spec).split(",").map((s) => s.trim()).filter(Boolean).map((s) => {
        const [model, effort] = s.split(":");
        return { model, effort: effort || null, label: effort ? `${model}:${effort}` : model };
    });
}

function loadExamples() {
    if (!fs.existsSync(EXAMPLES)) { console.error(`No examples folder at ${EXAMPLES}`); process.exit(1); }
    const only = args.papers ? new Set(String(args.papers).split(",")) : null;
    return fs.readdirSync(EXAMPLES).filter((n) => fs.statSync(path.join(EXAMPLES, n)).isDirectory() && (!only || only.has(n))).sort().map((name) => {
        const dir = path.join(EXAMPLES, name);
        const find = (base) => { const f = fs.readdirSync(dir).find((x) => x.replace(/\.[^.]+$/, "") === base && !x.endsWith(".json")); return f ? path.join(dir, f) : null; };
        const metaFile = path.join(dir, "meta.json");
        return { name, files: { full: find("full"), abstract: find("abstract") }, meta: fs.existsSync(metaFile) ? JSON.parse(fs.readFileSync(metaFile, "utf8")) : {} };
    }).filter((e) => e.files.full || e.files.abstract);
}

async function loadLiveVersions(examples) {
    const ids = examples.map((e) => e.meta.published_article_id).filter(Boolean);
    if (!ids.length) return {};
    try {
        const { Pool } = require("pg");
        const tenants = parseEnvFile(path.resolve(REPO, "..", "..", "..", ".env.tenants"), path.join(REPO, ".env.tenants"));
        const host = tenants[TENANT_KEY];
        if (!host) return {};
        const pool = new Pool({ host, user: process.env.PGUSER, password: process.env.PGPASSWORD, database: process.env.PGDATABASE, port: 5432, max: 1, ssl: { rejectUnauthorized: false, require: true } });
        const rows = (await pool.query(`SELECT id, title, innertext FROM article WHERE id = ANY($1)`, [ids])).rows;
        await pool.end();
        return Object.fromEntries(examples.map((e) => [e.name, rows.find((r) => r.id === e.meta.published_article_id)]).filter(([, r]) => r));
    } catch (e) {
        console.warn(`(live versions unavailable: ${e.message})`);
        return {};
    }
}

async function readDocument(file) {
    const ext = path.extname(file).toLowerCase();
    if (ext === ".pdf") return (await require("pdf-parse")(fs.readFileSync(file))).text; // exactly what /api/pdfToText returns
    if (ext === ".docx") return (await require("mammoth").extractRawText({ buffer: fs.readFileSync(file) })).value.trim();
    const raw = fs.readFileSync(file, "utf8");
    return (ext === ".html" || ext === ".htm" ? stripHtml(raw) : raw).trim();
}

function newResultsDir(suffix = "") {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const dir = path.join(HERE, "results", suffix ? `${stamp}-${suffix}` : stamp);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}

function cost(model, u, cachedOverride) {
    const p = PRICES[model];
    if (!p || !u) return null;
    const cached = cachedOverride ?? (u.prompt_tokens_details?.cached_tokens || 0);
    return round((((u.prompt_tokens || 0) - cached) * p[0] + cached * p[1] + (u.completion_tokens || 0) * p[2]) / 1e6, 5);
}

function readability(text) {
    const w = words(text).map((x) => x.replace(/[^A-Za-z']/g, "")).filter(Boolean);
    const sentences = Math.max(1, (text.match(/[.!?]+(\s|$)/g) || []).length);
    const syl = w.reduce((n, x) => n + Math.max(1, (x.toLowerCase().replace(/e$/, "").match(/[aeiouy]+/g) || []).length), 0);
    if (!w.length) return { ease: null, grade: null };
    return { ease: round(206.835 - 1.015 * (w.length / sentences) - 84.6 * (syl / w.length), 1), grade: round(0.39 * (w.length / sentences) + 11.8 * (syl / w.length) - 15.59, 1) };
}

function parseArgs(argv) {
    const out = {};
    for (let i = 0; i < argv.length; i++) {
        if (!argv[i].startsWith("--")) continue;
        const [k, inline] = argv[i].slice(2).split("=");
        if (inline !== undefined) out[k] = inline;
        else if (argv[i + 1] && !argv[i + 1].startsWith("--")) out[k] = argv[++i];
        else out[k] = true;
    }
    return out;
}

function loadEnv(file) {
    for (const [k, v] of Object.entries(parseEnvFile(file))) if (process.env[k] === undefined) process.env[k] = v;
}

function parseEnvFile(...files) {
    const o = {};
    for (const f of files) {
        if (!fs.existsSync(f)) continue;
        for (const line of fs.readFileSync(f, "utf8").split("\n")) {
            const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*(#.*)?$/);
            if (m && o[m[1]] === undefined) o[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
        }
    }
    return o;
}

function stripHtml(html) {
    return String(html).replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
}
function words(t) { return String(t).split(/\s+/).filter(Boolean); }
function round(x, d) { return x == null || Number.isNaN(x) ? null : Math.round(x * 10 ** d) / 10 ** d; }
function fmtCost(c) { return c == null ? "n/a" : `$${c.toFixed(4)}`; }
function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-|-$/g, ""); }

// ===========================================================================
// Main — last, so every top-level constant above is initialized.
// ===========================================================================

if (args["create-pending"]) await createPending();
else if (args.judge) await judgeRun();
else await evalRun();
