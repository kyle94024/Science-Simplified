#!/usr/bin/env node
/**
 * Corpus round-trip harness for the rich-text editor — READ-ONLY.
 *
 * For every stored rich-text value in every tenant DB, parse the HTML through
 * the editor's document model (components/ContentEditor/extensions.js) and
 * serialize it back, exactly the way opening an article in the editor and
 * saving it untouched would, then prove nothing was lost:
 *
 *   text_loss                  normalized text differs                    HARD FAIL
 *   structure_loss             block signature (headings/lists/quotes/
 *                              hr/img/pre, with list depth) differs       HARD FAIL
 *   apicss_loss                an apicss-* class present in the input is
 *                              gone from the output                       HARD FAIL
 *   sanitizer_not_fixed_point  lib/richText.js changes what the editor
 *                              emits (the server would destroy a save)    HARD FAIL
 *   sanitizer_text_disagrees   sanitize(raw) keeps different TEXT than the
 *                              editor keeps (e.g. a stray <title>)         HARD FAIL
 *   junk_normalized            Word/WordPress paste debris (MsoNormal,
 *                              inline style=) was dropped                 info only
 *   links_lost / tables_flattened                                         info only
 *
 * Usage (from the repo root):
 *   node --no-warnings scripts/richtext-roundtrip.mjs [--tenant=KEY] [--limit=N]
 *        [--report=PATH] [--json] [--selftest]
 *
 *   --tenant=KEY   one tenant (a key from .env.tenants); default: all Neon tenants
 *   --limit=N      rows per surface per tenant
 *   --report=PATH  where to write the JSON report (default: $TMPDIR)
 *   --json         print the report path on stdout
 *   --selftest     run the built-in equivalence cases, no DB needed
 *
 * Exit code: 1 on any HARD FAIL, 2 if a tenant could not be read (and nothing
 * else failed), else 0. Credentials come from .env (PGUSER/PGPASSWORD/
 * PGDATABASE) and the per-tenant hosts from .env.tenants; both are looked up
 * in the repo root and, for a git worktree, the main checkout.
 *
 * (Node prints a MODULE_TYPELESS_PACKAGE_JSON warning for the .js imports —
 * expected; run with --no-warnings.)
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { getSchema } from "@tiptap/core";
import { DOMParser, DOMSerializer } from "@tiptap/pm/model";
import { createExtensions } from "../src/components/ContentEditor/extensions.js";
import { sanitizeRichText } from "../src/lib/richText.js";

const require = createRequire(import.meta.url);
const { Pool } = require("pg");

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function usageError(message) {
    return Object.assign(new Error(message), { usage: true });
}

function parseArgs(argv) {
    const args = { tenant: null, limit: null, json: false, selftest: false, report: null, help: false };
    for (const raw of argv) {
        const [flag, value] = raw.includes("=") ? raw.split(/=(.*)/s) : [raw, null];
        switch (flag) {
            case "--tenant": args.tenant = value; break;
            case "--limit": args.limit = Math.max(1, parseInt(value, 10) || 0); break;
            case "--report": args.report = value; break;
            case "--json": args.json = true; break;
            case "--selftest": args.selftest = true; break;
            case "--help": case "-h": args.help = true; break;
            default: throw usageError(`Unknown argument: ${raw} (try --help)`);
        }
    }
    return args;
}

// ---------------------------------------------------------------------------
// Env / tenants (same model as scripts/check-auth-schema.js)
// ---------------------------------------------------------------------------

const ENV_LINE_RE = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*(#.*)?$/;

function findEnvFile(name) {
    const candidates = [
        path.join(REPO_ROOT, name),
        path.join(REPO_ROOT, "..", "..", "..", name), // .claude/worktrees/<name> -> main checkout
        path.join(process.cwd(), name),
    ];
    return candidates.find((f) => fs.existsSync(f)) || null;
}

function parseEnv(file) {
    const out = {};
    if (!file) return out;
    for (const line of fs.readFileSync(file, "utf8").split("\n")) {
        const m = line.match(ENV_LINE_RE);
        if (!m) continue;
        let value = m[2];
        const q = value.match(/^(['"])(.*)\1$/s);
        if (q) value = q[2];
        out[m[1]] = value;
    }
    return out;
}

function loadTenants(only) {
    const env = parseEnv(findEnvFile(".env"));
    const tenantEnv = parseEnv(findEnvFile(".env.tenants"));
    const shared = {
        user: env.PGUSER,
        password: env.PGPASSWORD,
        database: env.PGDATABASE,
        port: 5432,
        ssl: { rejectUnauthorized: false, require: true },
        connectionTimeoutMillis: 20000,
        idleTimeoutMillis: 5000,
        query_timeout: 120000,
        max: 1,
    };
    if (!shared.user || !shared.password || !shared.database) {
        throw usageError("PGUSER/PGPASSWORD/PGDATABASE not found in .env");
    }
    let tenants = Object.entries(tenantEnv)
        .filter(([, host]) => host.includes("aws.neon.tech"))
        .map(([key, host]) => ({ key, host }));
    if (only) {
        const wanted = only.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
        const unknown = wanted.filter((k) => !tenants.some((t) => t.key.toUpperCase() === k));
        if (unknown.length) throw usageError(`Unknown tenant(s): ${unknown.join(", ")}`);
        tenants = tenants.filter((t) => wanted.includes(t.key.toUpperCase()));
    }
    return { shared, tenants };
}

// ---------------------------------------------------------------------------
// Surfaces
// ---------------------------------------------------------------------------

const SURFACES = [
    { name: "article.innertext", table: "article", column: "innertext" },
    { name: "article.summary", table: "article", column: "summary" },
    { name: "pending_article.innertext", table: "pending_article", column: "innertext" },
    { name: "pending_article.summary", table: "pending_article", column: "summary" },
    { name: "article_translations.translated_innertext", table: "article_translations", column: "translated_innertext" },
    { name: "about_page_config.sections", table: "about_page_config", column: "sections", json: true },
];

const LOOKS_LIKE_HTML_RE = /<[a-z][\s\S]*>/i;

/** Every HTML-looking string inside a JSON value, with its path. */
function* htmlStringsIn(value, jsonPath) {
    if (typeof value === "string") {
        if (LOOKS_LIKE_HTML_RE.test(value)) yield { path: jsonPath, html: value };
    } else if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) yield* htmlStringsIn(value[i], `${jsonPath}[${i}]`);
    } else if (value && typeof value === "object") {
        for (const [k, v] of Object.entries(value)) yield* htmlStringsIn(v, `${jsonPath}.${k}`);
    }
}

async function existingTables(pool) {
    const { rows } = await pool.query(
        `SELECT table_name FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = ANY($1)`,
        [SURFACES.map((s) => s.table)],
    );
    return new Set(rows.map((r) => r.table_name));
}

/** Rows of one surface: { id, html }. Keyset-paginated so memory stays flat. */
async function* fetchRows(pool, surface, limit) {
    const { table, column } = surface; // from the constant list above, never user input
    if (surface.json) {
        const { rows } = await pool.query(`SELECT id, ${column} AS value FROM ${table} ORDER BY id`);
        let n = 0;
        for (const row of rows) {
            for (const hit of htmlStringsIn(row.value, column)) {
                if (limit && n >= limit) return;
                n++;
                yield { id: `${row.id}:${hit.path}`, html: hit.html };
            }
        }
        return;
    }
    const batch = 100;
    let lastId = 0;
    let seen = 0;
    for (;;) {
        const n = limit ? Math.min(batch, limit - seen) : batch;
        if (n <= 0) return;
        const { rows } = await pool.query(
            `SELECT id, ${column} AS html FROM ${table}
             WHERE id > $1 AND ${column} IS NOT NULL AND ${column} <> '' AND position('<' in ${column}) > 0
             ORDER BY id LIMIT $2`,
            [lastId, n],
        );
        if (!rows.length) return;
        for (const row of rows) yield { id: row.id, html: row.html };
        seen += rows.length;
        lastId = rows[rows.length - 1].id;
        if (rows.length < n) return;
    }
}

// ---------------------------------------------------------------------------
// The editor round trip (mirrors @tiptap/core createDocument + getHTML)
// ---------------------------------------------------------------------------

const schema = getSchema(createExtensions());
const pmParser = DOMParser.fromSchema(schema);
const pmSerializer = DOMSerializer.fromSchema(schema);
const { window } = new JSDOM("");
const { document } = window;

/** tiptap's elementFromString(): <body>-wrapped document parse. */
function parseAsEditor(html) {
    return new window.DOMParser().parseFromString(`<body>${html}</body>`, "text/html").body;
}

/** tiptap's removeWhitespaces(): text nodes that are exactly "\n" or "\n" + two
 *  whitespace chars are dropped before ProseMirror sees them. Copied verbatim
 *  because it is part of what the editor does to stored content. */
function removeWhitespaces(node) {
    const children = node.childNodes;
    for (let i = children.length - 1; i >= 0; i -= 1) {
        const child = children[i];
        if (child.nodeType === 3 && child.nodeValue && /^(\n\s\s|\n)$/.test(child.nodeValue)) {
            node.removeChild(child);
        } else if (child.nodeType === 1) {
            removeWhitespaces(child);
        }
    }
    return node;
}

/** What the editor would save for this stored HTML if nobody touched it. */
function editorRoundTrip(html) {
    const doc = pmParser.parse(removeWhitespaces(parseAsEditor(html)));
    const container = document.createElement("div");
    container.appendChild(pmSerializer.serializeFragment(doc.content, { document }));
    return container.innerHTML;
}

/** DOM canonical form: absorbs <hr> vs <hr />, entity spelling, attribute quoting. */
function canon(html) {
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.innerHTML;
}

// ---------------------------------------------------------------------------
// Equivalence rules
// ---------------------------------------------------------------------------

const APICSS_RE = /^apicss-[\w-]+$/;

/** ProseMirror's own block/ignore tag tables (prosemirror-model DOMParser). */
const PM_BLOCK_TAGS = new Set([
    "address", "article", "aside", "blockquote", "canvas", "dd", "div", "dl", "fieldset",
    "figcaption", "figure", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "header",
    "hgroup", "hr", "li", "noscript", "ol", "output", "p", "pre", "section", "table", "tfoot", "ul",
]);
const PM_IGNORE_TAGS = new Set(["head", "noscript", "object", "script", "style", "title"]);

/** Tags the schema has a parse rule for; a class on anything else cannot survive. */
const SCHEMA_TAGS = new Set([
    "p", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "blockquote", "hr", "pre", "img", "br",
    "strong", "b", "em", "i", "u", "s", "strike", "del", "code", "span", "a",
]);

const HEADING_TAGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);

/** An <img> the schema keeps (base64 is refused, src-less is dropped). */
function isKeptImage(el) {
    return el.matches('img[src]:not([src^="data:"])');
}

function tagOf(node) {
    return node.nodeName.toLowerCase();
}

function isBlank(text) {
    return !/\S/.test(text.replace(/\u00a0/g, " "));
}

/**
 * Text as the reader sees it: ProseMirror block tags (plus <br> and kept
 * images, which are blocks in this schema) separate words, everything else
 * (table cells, spans, unknown tags) runs together — exactly what the parser
 * does when it unwraps them. NBSP → space, whitespace collapsed, trimmed.
 */
function normalizedText(root) {
    let out = "";
    const walk = (node) => {
        for (const child of node.childNodes) {
            if (child.nodeType === 3) { out += child.nodeValue; continue; }
            if (child.nodeType !== 1) continue;
            const tag = tagOf(child);
            if (PM_IGNORE_TAGS.has(tag)) continue;
            const boundary = PM_BLOCK_TAGS.has(tag) || tag === "br" || (tag === "img" && isKeptImage(child));
            if (boundary) out += " ";
            walk(child);
            if (boundary) out += " ";
        }
    };
    walk(root);
    return out.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Block signature: document-order list of h1-h6/p/li/blockquote/ul/ol/hr/img/pre,
 * each tagged with its list nesting depth (so a heading or nested list that
 * ProseMirror ejects out of a list item is caught even though the block
 * sequence is unchanged), after the transforms the editor is allowed to make:
 *   - unknown wrappers (div, section, table, td, font …) are transparent
 *   - inline content outside a text block becomes a paragraph (one per run)
 *   - <li>text ≡ <li><p>text, and a block inside a <p> splits it
 *   - empty paragraphs are ignored (the parser inserts/leaves them freely)
 *   - <img src="data:…"> and src-less <img> are ignored (dropped on purpose)
 * Inline marks (b≡strong, i≡em, strike/del≡s) are not part of the signature.
 */
function blockSignature(root) {
    const sig = [];
    let ctx = null; // null: no text block open · "pending": <p> open, nothing emitted yet · "open": emitted
    let depth = 0; // enclosing <ul>/<ol> count
    const push = (tag) => sig.push(`${tag}:${depth}`);
    const text = () => {
        if (ctx === "open") return;
        push("p");
        ctx = "open";
    };
    const walk = (node) => {
        for (const child of node.childNodes) {
            if (child.nodeType === 3) {
                if (!isBlank(child.nodeValue)) text();
                continue;
            }
            if (child.nodeType !== 1) continue;
            const tag = tagOf(child);
            if (PM_IGNORE_TAGS.has(tag)) continue;
            if (tag === "p") {
                ctx = "pending";
                walk(child);
                ctx = null;
            } else if (HEADING_TAGS.has(tag) || tag === "pre") {
                push(tag);
                ctx = "open";
                walk(child);
                ctx = null;
            } else if (tag === "ul" || tag === "ol") {
                push(tag);
                ctx = null;
                depth++;
                walk(child);
                depth--;
                ctx = null;
            } else if (tag === "li" || tag === "blockquote") {
                push(tag);
                ctx = null;
                walk(child);
                ctx = null;
            } else if (tag === "hr") {
                push(tag);
                ctx = null;
            } else if (tag === "img") {
                if (isKeptImage(child)) { push("img"); ctx = null; }
            } else if (PM_BLOCK_TAGS.has(tag)) {
                ctx = null; // transparent block wrapper: closes the current paragraph
                walk(child);
                ctx = null;
            } else {
                walk(child); // inline / unknown: transparent, keeps the paragraph open
            }
        }
    };
    walk(root);
    return sig;
}

/**
 * apicss-* tokens in a tree. For the input, tokens on elements the schema has
 * no rule for (div.apicss-body, table.apicss-table …) are excluded — they are
 * transparent wrappers — and so are intentionally dropped images and <a>s
 * without an href. Those "silent" tokens are tallied separately for the report.
 */
function apicssTokens(root, { input, silent } = {}) {
    const tokens = new Set();
    for (const el of root.querySelectorAll("[class]")) {
        const classes = el.getAttribute("class").split(/\s+/).filter((c) => APICSS_RE.test(c));
        if (!classes.length) continue;
        const tag = tagOf(el);
        if (input) {
            const transparent =
                !SCHEMA_TAGS.has(tag) ||
                (tag === "img" && !isKeptImage(el)) ||
                (tag === "a" && !el.hasAttribute("href"));
            if (transparent) {
                if (silent) for (const c of classes) silent.set(`${tag}.${c}`, (silent.get(`${tag}.${c}`) || 0) + 1);
                continue;
            }
        }
        for (const c of classes) tokens.add(c);
    }
    return tokens;
}

/** Non-apicss classes and style attributes: paste debris the schema drops. */
function junkIn(root, tally) {
    let found = false;
    for (const el of root.querySelectorAll("*")) {
        if (el.hasAttribute("style")) {
            found = true;
            if (tally) tally.set("style=", (tally.get("style=") || 0) + 1);
        }
        const cls = el.getAttribute("class");
        if (!cls) continue;
        for (const c of cls.split(/\s+/)) {
            if (!c || APICSS_RE.test(c)) continue;
            found = true;
            if (tally) tally.set(`class=${c}`, (tally.get(`class=${c}`) || 0) + 1);
        }
    }
    return found;
}

function hrefsIn(root) {
    const set = new Set();
    for (const a of root.querySelectorAll("a[href]")) set.add(a.getAttribute("href"));
    return set;
}

// ---------------------------------------------------------------------------
// Per-row analysis
// ---------------------------------------------------------------------------

const CHECKS = ["text_loss", "structure_loss", "apicss_loss", "sanitizer_not_fixed_point", "sanitizer_text_disagrees"];
const INFO = ["junk_normalized", "links_lost", "tables_flattened"];

function newCounters() {
    const c = { rows: 0 };
    for (const k of [...CHECKS, ...INFO]) c[k] = 0;
    return c;
}

function addCounters(into, from) {
    for (const k of Object.keys(from)) into[k] = (into[k] || 0) + from[k];
}

function hardFails(c) {
    return CHECKS.reduce((n, k) => n + c[k], 0);
}

function firstDiff(a, b, context = 120) {
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i++;
    const from = Math.max(0, i - context);
    const cut = (s) => (from > 0 ? "…" : "") + s.slice(from, i + context) + (i + context < s.length ? "…" : "");
    return `@${i}\n      in : ${JSON.stringify(cut(a))}\n      out: ${JSON.stringify(cut(b))}`;
}

function sigDiff(a, b) {
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i++;
    const from = Math.max(0, i - 6);
    const show = (s) => (from > 0 ? "… " : "") + s.slice(from, i + 8).join(" ") + (i + 8 < s.length ? " …" : "");
    return `@${i} (in ${a.length} blocks, out ${b.length})\n      in : ${show(a)}\n      out: ${show(b)}`;
}

/** Analyse one stored HTML string. `tallies` collects corpus-wide statistics. */
function analyze(html, tallies) {
    const inRoot = parseAsEditor(html);
    const out = editorRoundTrip(html);
    const outRoot = parseAsEditor(out);

    const result = { out, flags: {}, details: {} };

    const inText = normalizedText(inRoot);
    const outText = normalizedText(outRoot);
    result.flags.text_loss = inText !== outText;
    if (result.flags.text_loss) result.details.text_loss = firstDiff(inText, outText);

    const inSig = blockSignature(inRoot);
    const outSig = blockSignature(outRoot);
    result.flags.structure_loss = inSig.join(" ") !== outSig.join(" ");
    if (result.flags.structure_loss) result.details.structure_loss = sigDiff(inSig, outSig);

    const inTokens = apicssTokens(inRoot, { input: true, silent: tallies?.silentApicss });
    const outTokens = apicssTokens(outRoot);
    const missing = [...inTokens].filter((t) => !outTokens.has(t));
    result.flags.apicss_loss = missing.length > 0;
    if (missing.length) {
        result.details.apicss_loss = `missing: ${missing.join(", ")}`;
        if (tallies) for (const t of missing) tallies.lostApicss.set(t, (tallies.lostApicss.get(t) || 0) + 1);
    }
    if (tallies) for (const t of inTokens) tallies.apicss.set(t, (tallies.apicss.get(t) || 0) + 1);

    const sanitized = canon(sanitizeRichText(out));
    const canonOut = canon(out);
    result.flags.sanitizer_not_fixed_point = sanitized !== canonOut;
    if (result.flags.sanitizer_not_fixed_point) {
        result.details.sanitizer_not_fixed_point = firstDiff(canonOut, sanitized);
    }

    // The publish chokepoint sanitizes RAW pending rows the editor never saw, so
    // sanitize(raw) must keep exactly the text the editor would keep — a legacy
    // row that is a whole HTML document must not surface its <title>.
    // Whitespace-insensitive: the editor turns unknown wrappers into blocks
    // (adding block spacing) while the sanitizer only unwraps them — only
    // extra or missing WORDS count as disagreement.
    const squash = (s) => s.replace(/\s+/g, "");
    const sanitizedRawText = normalizedText(parseAsEditor(sanitizeRichText(html) ?? ""));
    result.flags.sanitizer_text_disagrees = squash(sanitizedRawText) !== squash(outText);
    if (result.flags.sanitizer_text_disagrees) {
        result.details.sanitizer_text_disagrees = firstDiff(outText, sanitizedRawText);
    }

    result.flags.junk_normalized = junkIn(inRoot, tallies?.junk) && !junkIn(outRoot);

    const outHrefs = hrefsIn(outRoot);
    const lostHrefs = [...hrefsIn(inRoot)].filter((h) => !outHrefs.has(h));
    result.flags.links_lost = lostHrefs.length > 0;
    if (lostHrefs.length) result.details.links_lost = `hrefs dropped: ${lostHrefs.slice(0, 5).join(" , ")}`;

    result.flags.tables_flattened = inRoot.querySelector("table") != null;

    return result;
}

function excerpt(s, n = 300) {
    const flat = String(s).replace(/\s+/g, " ").trim();
    return flat.length > n ? flat.slice(0, n) + "…" : flat;
}

// ---------------------------------------------------------------------------
// Corpus run
// ---------------------------------------------------------------------------

const MAX_EXAMPLES = 30;

function newReport(args) {
    return {
        generated_at: new Date().toISOString(),
        args: { tenant: args.tenant, limit: args.limit },
        tenants: {},
        surfaces: Object.fromEntries(SURFACES.map((s) => [s.name, newCounters()])),
        totals: newCounters(),
        hard_failures: 0,
        failure_examples: [],
        connection_errors: [],
        apicss_classes: {},
        lost_apicss_classes: {},
        apicss_on_transparent_wrappers: {},
        junk_seen: {},
        exit_code: 0,
    };
}

function newTallies() {
    return { apicss: new Map(), lostApicss: new Map(), silentApicss: new Map(), junk: new Map() };
}

async function runTenant({ key, host }, shared, args, report, tallies) {
    const pool = new Pool({ host, ...shared });
    pool.on("error", () => { /* idle-client errors surface on the next query */ });
    const started = Date.now();
    const entry = { status: "ok", surfaces: {}, missing_tables: [], seconds: 0 };
    report.tenants[key] = entry;
    try {
        const tables = await existingTables(pool);
        for (const surface of SURFACES) {
            if (!tables.has(surface.table)) {
                entry.missing_tables.push(surface.table);
                continue;
            }
            const counters = newCounters();
            for await (const row of fetchRows(pool, surface, args.limit)) {
                counters.rows++;
                let result;
                try {
                    result = analyze(row.html, tallies);
                } catch (err) {
                    // A crash inside the editor pipeline is a loss of the whole row.
                    result = {
                        out: "",
                        flags: { text_loss: true, structure_loss: true },
                        details: { text_loss: `exception: ${err.message}` },
                    };
                }
                for (const k of [...CHECKS, ...INFO]) if (result.flags[k]) counters[k]++;
                for (const k of CHECKS) {
                    if (!result.flags[k]) continue;
                    if (report.failure_examples.length >= MAX_EXAMPLES) break;
                    report.failure_examples.push({
                        tenant: key,
                        surface: surface.name,
                        id: row.id,
                        check: k,
                        detail: result.details[k] || "",
                        input_excerpt: excerpt(row.html),
                        output_excerpt: excerpt(result.out),
                    });
                }
            }
            entry.surfaces[surface.name] = counters;
            addCounters(report.surfaces[surface.name], counters);
            addCounters(report.totals, counters);
            process.stderr.write(
                `  [${key}] ${surface.name.padEnd(42)} ${String(counters.rows).padStart(5)} rows` +
                `  hard=${hardFails(counters)}  junk=${counters.junk_normalized}\n`,
            );
        }
    } catch (err) {
        entry.status = "error";
        entry.error = err.message || String(err);
        report.connection_errors.push({ tenant: key, host, error: entry.error });
        process.stderr.write(`  [${key}] ERROR: ${entry.error}\n`);
    } finally {
        entry.seconds = Math.round((Date.now() - started) / 100) / 10;
        await pool.end().catch(() => {});
    }
}

function mapToSortedObject(map, limit = 60) {
    return Object.fromEntries([...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit));
}

function printTable(report) {
    const cols = ["rows", ...CHECKS.slice(0, 3), "junk_normalized", "sanitizer_not_fixed_point", "sanitizer_text_disagrees"];
    const w0 = Math.max(...Object.keys(report.surfaces).map((s) => s.length), 5) + 2;
    const header = "surface".padEnd(w0) + cols.map((c) => c.padStart(c.length + 2)).join("");
    const line = (name, c) => name.padEnd(w0) + cols.map((k) => String(c[k]).padStart(k.length + 2)).join("");
    console.log(header);
    console.log("-".repeat(header.length));
    for (const [name, c] of Object.entries(report.surfaces)) console.log(line(name, c));
    console.log("-".repeat(header.length));
    console.log(line("TOTAL", report.totals));
    console.log(
        `\ninfo: links_lost=${report.totals.links_lost}  tables_flattened=${report.totals.tables_flattened}` +
        `  tenants=${Object.keys(report.tenants).length}  connection_errors=${report.connection_errors.length}`,
    );
}

function printExamples(examples, n = 10) {
    if (!examples.length) return;
    console.log(`\nFirst ${Math.min(n, examples.length)} of ${examples.length} saved failure examples:`);
    examples.slice(0, n).forEach((ex, i) => {
        console.log(`\n[${i + 1}] ${ex.tenant} ${ex.surface} id=${ex.id} — ${ex.check}`);
        if (ex.detail) console.log(`    ${ex.detail}`);
        console.log(`    input : ${ex.input_excerpt}`);
        console.log(`    output: ${ex.output_excerpt}`);
    });
}

async function runCorpus(args) {
    const { shared, tenants } = loadTenants(args.tenant);
    const report = newReport(args);
    const tallies = newTallies();
    process.stderr.write(`Round-tripping ${tenants.length} tenant DB(s) through the editor schema (read-only)…\n`);
    for (const tenant of tenants) {
        process.stderr.write(`[${tenant.key}]\n`);
        await runTenant(tenant, shared, args, report, tallies);
    }

    report.apicss_classes = mapToSortedObject(tallies.apicss);
    report.lost_apicss_classes = mapToSortedObject(tallies.lostApicss);
    report.apicss_on_transparent_wrappers = mapToSortedObject(tallies.silentApicss);
    report.junk_seen = mapToSortedObject(tallies.junk, 40);
    report.hard_failures = hardFails(report.totals);
    report.exit_code = report.hard_failures ? 1 : report.connection_errors.length ? 2 : 0;

    const reportPath = path.resolve(args.report || path.join(os.tmpdir(), "richtext-roundtrip-report.json"));
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    printTable(report);
    printExamples(report.failure_examples);
    if (report.connection_errors.length) {
        console.log("\nTenants that could not be read:");
        for (const e of report.connection_errors) console.log(`  ${e.tenant}: ${e.error}`);
    }
    if (args.json) console.log(`\n${reportPath}`);
    else process.stderr.write(`\nReport: ${reportPath}\n`);
    return report.exit_code;
}

// ---------------------------------------------------------------------------
// Self-test: the equivalence rules against known transforms
// ---------------------------------------------------------------------------

const SELFTEST_CASES = [
    {
        name: "AI dialect survives untouched",
        html: '<div class="apicss-body"><h2 class="apicss-heading-secondary">Key findings</h2>' +
            '<p class="apicss-paragraph">Patients <span class="apicss-text-success">improved</span> ' +
            '<strong class="apicss-strong">a lot</strong> <em>quickly</em>.</p>' +
            '<ul class="apicss-list"><li class="apicss-list-item">one<ul><li>nested</li></ul></li><li>two</li></ul>' +
            '<blockquote class="apicss-blockquote"><p>quote</p></blockquote><hr class="apicss-hr">' +
            '<p><a class="apicss-link" href="https://example.org">link</a> <code>x</code></p></div>',
        expect: {},
    },
    {
        name: "docx dialect: underline span, <s>, <b>/<i>/<strike>/<del> aliases",
        html: '<p class="apicss-paragraph"><span class="apicss-underline">u</span> <s>s</s> <b>b</b> <i>i</i> <strike>k</strike> <del>d</del></p>',
        expect: {},
    },
    {
        name: "Word paste debris is dropped, text kept",
        html: '<p class="MsoNormal" style="margin:0cm"><span style="font-family:Calibri">Hello</span> <span style="font-weight:bold">world</span></p>' +
            '<p class="has-normal-font-size" style="text-align:center">centered</p>',
        expect: { junk_normalized: true },
    },
    {
        name: "bare <li>text ≡ <li><p>text; nested list after leading text",
        html: "<ol><li>first<ol><li>inner</li></ol></li><li>second</li></ol>",
        expect: {},
    },
    {
        name: "base64 image is dropped without splitting the paragraph",
        html: '<p>before<img src="data:image/png;base64,iVBORw0KGgo=" class="apicss-image">after</p>',
        expect: {},
    },
    {
        name: "a real image inside <p> splits it (still the same blocks)",
        html: '<p class="apicss-paragraph">before<img src="https://cdn.example.org/a.png" class="apicss-image">after</p>',
        expect: {},
    },
    {
        name: "table cells are transparent (text runs together, per the contract)",
        html: '<table class="apicss-table"><tbody><tr><td>a</td><td>b</td></tr></tbody></table><p>after</p>',
        expect: { tables_flattened: true },
    },
    {
        name: "empty and nbsp paragraphs are ignored",
        html: "<p></p><p>&nbsp;</p><p>text</p><p><br></p><ul><li><p></p><ul><li>deep</li></ul></li></ul>",
        expect: {},
    },
    {
        name: "top-level inline runs become paragraphs",
        html: 'intro text<br>more<div>wrapped</div><strong>bold</strong> tail',
        expect: {},
    },
    {
        name: "font/section/figure wrappers are transparent",
        html: '<section><figure><img src="https://x/y.png"><figcaption>cap</figcaption></figure><font color="red">red</font></section>',
        expect: {},
    },
    // --- known losses the harness MUST detect --------------------------------
    {
        name: "DETECT: newline-only text between inline elements is pruned (words merge)",
        html: "<p><strong>blood</strong>\n<em>pressure</em></p>",
        expect: { text_loss: true },
    },
    {
        name: "DETECT: nested list with no leading paragraph is ejected from its item",
        html: "<ul><li><ul><li>deep</li></ul></li></ul>",
        expect: { structure_loss: true },
    },
    {
        name: "DETECT: heading inside a list item breaks the list",
        html: "<ul><li><h3>title</h3>text</li></ul>",
        expect: { structure_loss: true },
    },
    {
        name: "<ol start=\"3\"> (typed \"3. \") survives the sanitizer",
        html: '<ol start="3"><li><p>third</p></li></ol>',
        expect: {},
        expectOut: '<ol start="3">',
    },
    {
        name: "DETECT: link wrapping an image is lost (class and href)",
        html: '<a class="apicss-link" href="https://example.org"><img src="https://x/y.png"></a>',
        expect: { apicss_loss: true, links_lost: true },
    },
    {
        name: "<sub>/<sup> are in the schema and keep their apicss class",
        html: '<p>FEV<sub>1</sub> and x<sup class="apicss-sup">2</sup></p>',
        expect: {},
        expectOut: '<sup class="apicss-sup">2</sup>',
    },
    {
        name: "a whole HTML document (legacy AI row): <title>/<head> text is dropped by BOTH sanitizer and editor",
        html: '<!DOCTYPE html><html><head><title>Science Article Simplified</title><style>p{}</style></head><body><p>body</p></body></html>',
        expect: {},
        expectOut: "<p>body</p>",
    },
    {
        name: "DETECT: sanitizer drops <textarea> text that the editor keeps",
        html: "<p>a</p><textarea>kept by editor</textarea>",
        expect: { sanitizer_text_disagrees: true },
    },
    {
        name: "DETECT: <b style=\"font-weight:normal\"> is unwrapped, taking its apicss class with it",
        html: '<p><b class="apicss-strong" style="font-weight:normal">n</b></p>',
        expect: { apicss_loss: true, junk_normalized: true },
    },
];

function runSelftest() {
    let failed = 0;
    for (const c of SELFTEST_CASES) {
        const r = analyze(c.html);
        const problems = [];
        for (const k of [...CHECKS, ...INFO]) {
            const want = Boolean(c.expect[k]);
            if (Boolean(r.flags[k]) !== want) problems.push(`${k}: expected ${want}, got ${Boolean(r.flags[k])}`);
        }
        if (c.expectOut && !r.out.includes(c.expectOut)) problems.push(`output lacks ${JSON.stringify(c.expectOut)}`);
        const ok = problems.length === 0;
        if (!ok) failed++;
        console.log(`${ok ? "ok  " : "FAIL"} ${c.name}`);
        if (!ok) {
            for (const p of problems) console.log(`      ${p}`);
            for (const [k, d] of Object.entries(r.details)) console.log(`      ${k}: ${d}`);
            console.log(`      in : ${excerpt(c.html)}`);
            console.log(`      out: ${excerpt(r.out)}`);
        }
    }
    console.log(`\n${SELFTEST_CASES.length - failed}/${SELFTEST_CASES.length} self-test cases passed`);
    return failed ? 1 : 0;
}

// ---------------------------------------------------------------------------

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
        const header = fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("*/")[0];
        console.log(header.replace(/^#!.*\n\/\*\*\n/, "").replace(/^ \* ?/gm, ""));
        return 0;
    }
    return args.selftest ? runSelftest() : runCorpus(args);
}

// Importable (e.g. by a test) without running: `import { analyze } from "./richtext-roundtrip.mjs"`.
export { analyze, blockSignature, normalizedText, editorRoundTrip, runTenant, loadTenants, SURFACES };

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main().then(
        (code) => { process.exitCode = code; },
        (err) => {
            console.error(err.usage ? err.message : err.stack || String(err));
            process.exitCode = 1;
        },
    );
}
