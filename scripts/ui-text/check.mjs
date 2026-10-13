#!/usr/bin/env node
/**
 * Checks the interface-text dictionaries (src/lib/uiText/<lang>.js) against
 * the English the site actually shows.
 *
 * English comes from:
 *   - the code: t("…"), t.rich("…"), uiText("…") and <UiText text="…" /> string literals
 *   - site copy of tenants with the language picker (sites.js
 *     `articleTranslations`): the strings their pages pass to t() / <UiText>
 *     from config — home/footer copy, the About page defaults, …
 *
 * Reports, per language:
 *   missing      English with no translation (it shows in English)
 *   mismatched   translations whose {placeholders} or HTML tags differ from the English
 *   duplicates   the same English twice in one dictionary (the last one wins)
 *   unused       entries nothing uses any more (informational)
 * Exits non-zero when anything but `unused` is found.
 *
 *   npm run ui-text:check                 # all languages
 *   npm run ui-text:check -- --lang es    # one language
 *   npm run ui-text:check -- --list       # print every English string found
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { register } from "node:module";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "../..");
const SRC = path.join(REPO, "src");
const DICT_DIR = path.join(SRC, "lib/uiText");
const args = process.argv.slice(2);
const only = args.includes("--lang") ? args[args.indexOf("--lang") + 1] : null;

register("../token-study/alias-hooks.mjs", import.meta.url);
const load = (rel) => import(pathToFileURL(path.join(SRC, rel)).href);
const { sites } = await load("lib/sites.js");
const { buildDefaultSections } = await load("lib/about-config.js");
const { SUPPORTED_LANGUAGES } = await load("lib/translationWarnings.js");

// ---------------------------------------------------------------------------
// English in use
// ---------------------------------------------------------------------------

const used = new Map(); // English → where it was found

function add(text, where) {
    if (typeof text !== "string" || !text.trim()) return;
    if (!used.has(text)) used.set(text, where);
}

const STRING = String.raw`("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|` + "`(?:[^`\\\\$]|\\\\.)*`)";
const PATTERNS = [
    new RegExp(String.raw`(?<![\w.$])t\(\s*` + STRING, "g"),
    new RegExp(String.raw`(?<![\w.$])t\.rich\(\s*` + STRING, "g"),
    new RegExp(String.raw`(?<![\w.$])uiText\(\s*` + STRING, "g"),
    new RegExp(String.raw`<UiText\s+text=` + STRING, "g"),
];

function unquote(lit) {
    const q = lit[0];
    const body = lit.slice(1, -1);
    if (q === '"') return JSON.parse(lit);
    // '…' and `…`: unescape the same way JSON would.
    return JSON.parse('"' + body.replace(/\\(['`])/g, "$1").replace(/"/g, '\\"') + '"');
}

function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(p);
        else if (/\.(jsx?|mjs)$/.test(entry.name) && path.dirname(p) !== DICT_DIR) {
            // Blank out comments (keeping line numbers) so usage examples in docs don't count.
            const code = fs
                .readFileSync(p, "utf8")
                .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
                .replace(/(^|[^:\\"'`\w])\/\/[^\n]*/gm, (m, before) => before + " ".repeat(m.length - before.length));
            for (const re of PATTERNS) {
                for (const m of code.matchAll(re)) {
                    const line = code.slice(0, m.index).split("\n").length;
                    add(unquote(m[1]), `${path.relative(REPO, p)}:${line}`);
                }
            }
        }
    }
}
walk(SRC);

// Site copy that pages pass through t() / <UiText> from tenant config.
const SKIP_KEYS = new Set(["id", "type", "icon", "name", "imageUrl", "photoUrl", "logoUrl", "backgroundImageUrl", "link", "ctaLink", "logoAlt", "width", "height", "logoWidth", "logoHeight", "visible"]);
function addCopy(value, where) {
    if (typeof value === "string") return add(value, where);
    if (Array.isArray(value)) return value.forEach((v, i) => addCopy(v, `${where}[${i}]`));
    if (value && typeof value === "object") {
        for (const [k, v] of Object.entries(value)) if (!SKIP_KEYS.has(k)) addCopy(v, `${where}.${k}`);
    }
}
for (const [key, site] of Object.entries(sites)) {
    if (!site.articleTranslations) continue;
    for (const field of ["disease", "text_homeTitleDescription", "text_exploreAllTitle", "text_exploreAllDescription", "text_footerDescription"]) {
        add(site[field], `sites.${key}.${field}`);
    }
    for (const section of buildDefaultSections(site)) addCopy(section.content, `about(${key}).${section.type}`);
}

// Messages our API routes send back that reader-facing pages show through
// t(data.message) / t(data.error) / t(err.message). Each must still appear,
// word for word, somewhere under src/app/api — otherwise its translation is stale.
const API_MESSAGES = [
    // auth: login, signup, password reset/update
    "Invalid credentials",
    "Error during login",
    "Account created successfully",
    "Email already in use.",
    "Error creating account",
    "User not found",
    "Something went wrong",
    "Invalid or expired token",
    "Token has expired",
    "Error updating password",
    "Current password is incorrect",
    // contact forms
    "Error adding article request",
    "Error adding bug report",
    // favorites
    "Invalid request body",
    "Invalid user ID or article ID",
    "Article already favorited",
    "Favorite not found",
    "Internal server error",
    "Valid userId query parameter is required",
    "Error executing query",
];
let apiSource = "";
(function readApi(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) readApi(p);
        else if (/\.(jsx?|mjs)$/.test(entry.name)) apiSource += fs.readFileSync(p, "utf8");
    }
})(path.join(SRC, "app/api"));
const staleApiMessages = API_MESSAGES.filter((m) => !apiSource.includes(m));
for (const m of API_MESSAGES) add(m, "API message");

if (args.includes("--list")) {
    for (const [text, where] of used) console.log(`${where}\t${JSON.stringify(text)}`);
    console.log(`\n${used.size} strings`);
    process.exit(0);
}

// ---------------------------------------------------------------------------
// Dictionaries
// ---------------------------------------------------------------------------

const placeholders = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
const tags = (s) => [...s.matchAll(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi)].map((m) => m[0].replace(/\s+(?!class=)[\w-]+="[^"]*"/g, "")).join("");

let problems = staleApiMessages.length;
const langs = SUPPORTED_LANGUAGES.map((l) => l.code).filter((c) => !only || c === only);
console.log(`${used.size} English strings in use\n`);
for (const m of staleApiMessages) console.log(`API message no longer found in src/app/api: ${JSON.stringify(m)} (update API_MESSAGES and the dictionaries)`);

for (const lang of langs) {
    const file = path.join(DICT_DIR, `${lang}.js`);
    const source = fs.readFileSync(file, "utf8");
    const dict = (await import(pathToFileURL(file).href)).default;

    const seen = new Map();
    for (const m of source.matchAll(/^\s*("(?:[^"\\\n]|\\.)*")\s*:/gm)) {
        const key = JSON.parse(m[1]);
        seen.set(key, (seen.get(key) || 0) + 1);
    }
    const duplicates = [...seen].filter(([, n]) => n > 1).map(([k]) => k);
    const missing = [...used.keys()].filter((k) => !Object.prototype.hasOwnProperty.call(dict, k));
    const mismatched = Object.entries(dict).filter(([en, tr]) =>
        typeof tr !== "string" || !tr.trim() || placeholders(en) !== placeholders(tr) || tags(en) !== tags(tr)
    );
    const unused = Object.keys(dict).filter((k) => !used.has(k));

    console.log(`${lang}: ${Object.keys(dict).length} entries — missing ${missing.length} · mismatched ${mismatched.length} · duplicates ${duplicates.length} · unused ${unused.length}`);
    for (const k of missing) console.log(`  missing     ${JSON.stringify(k)}   (${used.get(k)})`);
    for (const [k, v] of mismatched) console.log(`  mismatched  ${JSON.stringify(k)} → ${JSON.stringify(v)}`);
    for (const k of duplicates) console.log(`  duplicate   ${JSON.stringify(k)}`);
    for (const k of unused) console.log(`  unused      ${JSON.stringify(k)}`);
    problems += missing.length + mismatched.length + duplicates.length;
}

process.exit(problems ? 1 : 0);
