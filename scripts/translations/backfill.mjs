#!/usr/bin/env node
/**
 * Pre-translate a tenant's published articles into every supported language
 * (or a subset) so the site-wide language switcher is instant.
 *
 * Safe to re-run at any time:
 *   - translations that match the article's current text are skipped
 *   - stale ones (article edited since) and missing ones are generated
 *   - the same claim as live requests is used, so this script and real readers
 *     never translate the same (article, language) at the same moment
 *   - each translation is validated against the English structure before it's
 *     stored; failures store nothing and are listed at the end
 *
 * Usage (from the repo root):
 *   npm run translations:backfill -- --tenant NF                 # everything missing/stale
 *   npm run translations:backfill -- --tenant NF --dry-run       # just count
 *   npm run translations:backfill -- --tenant NF --langs es,zh --ids 334,342 --concurrency 4
 *
 * Logic lives in src/lib/articleTranslations.js; this only schedules it.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { register } from "node:module";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "../..");
const args = parseArgs(process.argv.slice(2));
if (args.help) {
    console.log(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("*/")[0].replace(/^#!.*\n\/\*\*\n/, "").replace(/^ \* ?/gm, ""));
    process.exit(0);
}

const TENANT = String(args.tenant || "").toUpperCase();
const tenants = readEnv(path.resolve(REPO, "..", "..", "..", ".env.tenants"), path.join(REPO, ".env.tenants"));
if (!TENANT || !tenants[TENANT]) {
    console.error(`--tenant is required (one of: ${Object.keys(tenants).join(", ")})`);
    process.exit(1);
}
// Point the app's own db module at the tenant before anything imports it.
process.chdir(REPO);
for (const [k, v] of Object.entries(readEnv(path.join(REPO, ".env")))) if (process.env[k] === undefined) process.env[k] = v;
process.env.PGHOST = tenants[TENANT];
delete process.env.DATABASE_URL;
process.env.NEXT_PUBLIC_SITE_KEY = args["site-key"] || (TENANT === "NF" ? "NF" : process.env.NEXT_PUBLIC_SITE_KEY || "NF");

// src/lib/db.js logs every query; keep this script's output readable.
const log = console.log.bind(console);
console.log = (...a) => { if (typeof a[0] === "string" && a[0].startsWith("Executed query")) return; log(...a); };

register("../token-study/alias-hooks.mjs", import.meta.url);
const T = await import("../../src/lib/articleTranslations.js");
const { query, default: pool } = await import("../../src/lib/db.js");

const langs = args.langs ? String(args.langs).split(",").map((s) => s.trim()).filter(Boolean) : T.LANGUAGE_CODES;
const bad = langs.filter((l) => !T.isSupportedLanguage(l));
if (bad.length) { console.error(`Unsupported language(s): ${bad.join(", ")}. Supported: ${T.LANGUAGE_CODES.join(", ")}`); process.exit(1); }
const ids = args.ids ? String(args.ids).split(",").map(Number).filter(Number.isInteger) : null;
const concurrency = Math.max(1, Number(args.concurrency) || 6);

// Current state of every (article, language) pair.
const { rows } = await query(
    `SELECT a.id, l.lang,
            CASE WHEN tr.id IS NULL OR tr.source_hash IS NULL THEN 'missing'
                 WHEN tr.source_hash = md5($1 || chr(31) || coalesce(a.title,'') || chr(31) || coalesce(a.summary,'') || chr(31) || coalesce(a.innertext,'')) THEN 'fresh'
                 ELSE 'stale' END AS state
     FROM article a
     CROSS JOIN unnest($2::text[]) AS l(lang)
     LEFT JOIN article_translations tr ON tr.article_id = a.id AND tr.language = l.lang
     ${ids ? "WHERE a.id = ANY($3::int[])" : ""}
     ORDER BY a.id DESC, l.lang`,
    ids ? [T.TRANSLATION_VERSION, langs, ids] : [T.TRANSLATION_VERSION, langs]
);
const count = (state) => rows.filter((r) => r.state === state).length;
const articles = new Set(rows.map((r) => r.id)).size;
log(`tenant ${TENANT} — ${articles} article(s) × ${langs.length} language(s) [${langs.join(", ")}] = ${rows.length} translations`);
log(`  up to date ${count("fresh")} · stale ${count("stale")} · missing ${count("missing")}`);

const todo = rows.filter((r) => r.state !== "fresh");
if (args["dry-run"] || todo.length === 0) {
    log(todo.length ? "\n(dry run — nothing generated)" : "\nNothing to do.");
    await pool.end();
    process.exit(0);
}

log(`\ngenerating ${todo.length} with concurrency ${concurrency}…\n`);
const started = Date.now();
const results = [];
let next = 0, done = 0;
async function worker() {
    while (next < todo.length) {
        const job = todo[next++];
        const t0 = Date.now();
        let status, error = null;
        try {
            const r = await T.ensureArticleTranslation(job.id, job.lang);
            status = r.status === "ready" ? (r.cached ? "already fresh" : "generated") : r.status;
        } catch (e) {
            status = "failed";
            error = String(e.message || e);
        }
        const seconds = (Date.now() - t0) / 1000;
        results.push({ ...job, status, error, seconds });
        done++;
        log(`  [${String(done).padStart(String(todo.length).length)}/${todo.length}] #${job.id} ${job.lang}: ${status}${error ? ` — ${error.slice(0, 140)}` : ""} (${seconds.toFixed(1)}s)`);
    }
}
await Promise.all(Array.from({ length: Math.min(concurrency, todo.length) }, worker));

const by = (s) => results.filter((r) => r.status === s);
const minutes = ((Date.now() - started) / 60000).toFixed(1);
log(`\ndone in ${minutes} min — generated ${by("generated").length} · already fresh ${by("already fresh").length} · in progress elsewhere ${by("pending").length} · failed ${by("failed").length}`);
if (by("failed").length) {
    log("failures (nothing stored for these; re-run to retry):");
    for (const r of by("failed")) log(`  #${r.id} ${r.lang}: ${r.error}`);
}
const gen = by("generated");
if (gen.length) log(`average ${(gen.reduce((n, r) => n + r.seconds, 0) / gen.length).toFixed(1)}s per translation`);
await pool.end();
process.exit(by("failed").length ? 1 : 0);

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

function readEnv(...files) {
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
