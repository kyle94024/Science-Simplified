/**
 * Stored article translations — the one place that reads, generates,
 * validates and stores them. Server-only (it calls OpenAI and the database).
 *
 * Correctness rests on one rule: a stored translation is served only while its
 * `source_hash` matches the article's CURRENT English text (title, summary,
 * body) plus TRANSLATION_VERSION. Editing an article therefore makes its
 * translations stale on its own; no code path has to remember to invalidate
 * them. Bumping TRANSLATION_VERSION (new prompt/model) invalidates them all.
 *
 * Generation is guarded by a claim (`generating_since`) so concurrent readers,
 * background warmers and the backfill script never translate the same
 * (article, language) twice at once. Output is validated against the English
 * structure before it's stored; a failed or abandoned attempt leaves nothing
 * servable behind.
 *
 * Schema: scripts/migrations/2026-article-translations-v2.sql
 * Background warm-up after publish/edit: src/lib/articleTranslationsWarmup.js
 * (kept separate so this module also runs in plain Node scripts).
 */
import crypto from "crypto";
import { query } from "@/lib/db";
import { tenant } from "@/lib/config";
import { sanitizeRichText } from "@/lib/richText";
import { SUPPORTED_LANGUAGES } from "@/lib/translationWarnings";
import { translateHtmlContent, translatePlainText, TRANSLATION_MODEL } from "@/utils/apiHelpers";

/**
 * Tenants that pre-translate their articles and show the site-wide language
 * switcher (sites.js `articleTranslations: true`). Every tenant can still
 * translate an article on demand from the article page.
 */
export const translationsEnabled = !!tenant?.articleTranslations;

/** Bump to make every stored translation stale (e.g. after a prompt or model change). */
export const TRANSLATION_VERSION = "v1";

/** A claim older than this is treated as abandoned (crashed or timed-out request). */
const CLAIM_SECONDS = 180;

export const LANGUAGE_CODES = SUPPORTED_LANGUAGES.map((l) => l.code);

export function isSupportedLanguage(code) {
    return LANGUAGE_CODES.includes(code);
}

/** md5 of the English version a translation is made from. Must match SOURCE_HASH_SQL. */
export function articleSourceHash({ title, summary, innertext }) {
    return crypto
        .createHash("md5")
        .update([TRANSLATION_VERSION, title ?? "", summary ?? "", innertext ?? ""].join("\u001f"), "utf8")
        .digest("hex");
}

/** The same hash computed in SQL over an `article` alias; `$v` is TRANSLATION_VERSION. */
function sourceHashSql(alias, versionParam) {
    return `md5(${versionParam} || chr(31) || coalesce(${alias}.title, '') || chr(31) || coalesce(${alias}.summary, '') || chr(31) || coalesce(${alias}.innertext, ''))`;
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

/**
 * Up-to-date translated title + summary for every published article in one
 * language — what article lists overlay on their cards. Stale and incomplete
 * rows are left out, so the English text shows for those.
 * @returns {Promise<Record<number, {title: string, summary: string|null}>>}
 */
export async function getTranslationOverlay(lang) {
    if (!isSupportedLanguage(lang)) return {};
    const { rows } = await query(
        `SELECT tr.article_id, tr.translated_title, tr.translated_summary
         FROM article_translations tr
         JOIN article a ON a.id = tr.article_id
         WHERE tr.language = $2
           AND tr.source_hash = ${sourceHashSql("a", "$1")}`,
        [TRANSLATION_VERSION, lang]
    );
    return Object.fromEntries(
        rows.map((r) => [r.article_id, { title: r.translated_title, summary: r.translated_summary }])
    );
}

/** The article and its stored translation, with whether that translation is current. */
async function readArticleAndTranslation(articleId, lang) {
    const { rows } = await query(
        `SELECT a.id, a.title, a.summary, a.innertext,
                tr.translated_title, tr.translated_summary, tr.translated_innertext,
                tr.source_hash, tr.model, tr.updated_at
         FROM article a
         LEFT JOIN article_translations tr ON tr.article_id = a.id AND tr.language = $2
         WHERE a.id = $1`,
        [articleId, lang]
    );
    const row = rows[0];
    if (!row) return { article: null };
    const article = { id: row.id, title: row.title, summary: row.summary, innertext: row.innertext };
    const fresh = row.source_hash != null && row.source_hash === articleSourceHash(article);
    return {
        article,
        fresh,
        translation: fresh
            ? { translated_title: row.translated_title, translated_summary: row.translated_summary, translated_innertext: row.translated_innertext, model: row.model, updated_at: row.updated_at }
            : null,
    };
}

// ---------------------------------------------------------------------------
// Generating
// ---------------------------------------------------------------------------

/**
 * Return the current translation, generating and storing it if it's missing
 * or stale.
 * @returns {Promise<
 *   | {status: "ready", translation: object, cached: boolean}
 *   | {status: "pending"}        another request is generating it right now
 *   | {status: "not_found"}
 * >}
 * Throws if generation fails (nothing is stored in that case).
 */
export async function ensureArticleTranslation(articleId, lang) {
    if (!isSupportedLanguage(lang)) throw new Error(`Unsupported language: ${lang}`);
    const current = await readArticleAndTranslation(articleId, lang);
    if (!current.article) return { status: "not_found" };
    if (current.fresh) return { status: "ready", translation: current.translation, cached: true };

    if (!(await claim(articleId, lang))) return { status: "pending" };
    try {
        const { article } = current;
        const translation = await generateTranslation(article, lang);
        // Stored under the hash of the English version we actually translated: if
        // the article was edited meanwhile, this row is simply stale on arrival.
        await query(
            `UPDATE article_translations
             SET translated_title = $3, translated_summary = $4, translated_innertext = $5,
                 source_hash = $6, model = $7, updated_at = NOW(), generating_since = NULL
             WHERE article_id = $1 AND language = $2`,
            [articleId, lang, translation.translated_title, translation.translated_summary, translation.translated_innertext, articleSourceHash(article), TRANSLATION_MODEL]
        );
        return { status: "ready", translation: { ...translation, model: TRANSLATION_MODEL }, cached: false };
    } catch (err) {
        await release(articleId, lang);
        throw err;
    }
}

/**
 * Bring every language of one article up to date — used in the background
 * after an article is published or edited. Never throws.
 */
export async function warmArticleTranslations(articleId, langs = LANGUAGE_CODES) {
    const results = await Promise.allSettled(langs.map((l) => ensureArticleTranslation(articleId, l)));
    const summary = Object.fromEntries(
        langs.map((l, i) => [l, results[i].status === "fulfilled" ? results[i].value.status : `error: ${results[i].reason?.message}`])
    );
    console.log(`[translations] warm article ${articleId}:`, JSON.stringify(summary));
    return summary;
}

/** Take the generation claim for (article, language); false if someone else holds it. */
async function claim(articleId, lang) {
    const { rows } = await query(
        `INSERT INTO article_translations (article_id, language, generating_since)
         VALUES ($1, $2, NOW())
         ON CONFLICT (article_id, language) DO UPDATE SET generating_since = NOW()
         WHERE article_translations.generating_since IS NULL
            OR article_translations.generating_since < NOW() - make_interval(secs => $3)
         RETURNING id`,
        [articleId, lang, CLAIM_SECONDS]
    );
    return rows.length > 0;
}

async function release(articleId, lang) {
    await query(
        `UPDATE article_translations SET generating_since = NULL WHERE article_id = $1 AND language = $2`,
        [articleId, lang]
    ).catch(() => {});
}

/**
 * Translate title, summary and body. Each must come back actually translated
 * (the model occasionally echoes the English) and the body must keep the
 * English structure; each gets one retry, then nothing is stored.
 */
async function generateTranslation(article, lang) {
    const { name } = SUPPORTED_LANGUAGES.find((l) => l.code === lang);
    const where = `article ${article.id} ${lang}`;
    // Summaries are plain text or HTML; plain text goes through the plain-text
    // prompt (the HTML one sometimes returns plain text untranslated).
    const summaryIsHtml = /<[a-z][^>]*>/i.test(article.summary ?? "");
    const [title, summary] = await Promise.all([
        translateUntilChanged(article.title, () => translatePlainText(article.title, lang, name), `${where} title`),
        article.summary
            ? translateUntilChanged(
                  article.summary,
                  () => (summaryIsHtml ? translateHtmlContent : translatePlainText)(article.summary, lang, name),
                  `${where} summary`
              )
            : Promise.resolve(null),
    ]);

    // Same allowlist as every other rich-text write; pages render these as HTML.
    // Validation compares what readers will actually see — both sides cleaned —
    // so Word debris in the English (e.g. class="MsoNormal") can't skew the counts.
    let body = null;
    if (article.innertext) {
        const english = sanitizeRichText(article.innertext);
        let problem = null;
        for (let attempt = 1; attempt <= 2; attempt++) {
            body = sanitizeRichText(stripFences(await translateHtmlContent(article.innertext, lang, name)));
            problem = untranslated(english, body) ? "came back in English" : structureProblem(english, body, lang);
            if (!problem) break;
            console.warn(`[translations] ${where} attempt ${attempt}: ${problem}`);
        }
        if (problem) throw new Error(`translation failed validation: ${problem}`);
    }

    return {
        translated_title: title.trim(),
        translated_summary: summary == null ? null : sanitizeRichText(summary),
        translated_innertext: body,
    };
}

/** Run `translate` (one retry) until it returns something other than the English. */
async function translateUntilChanged(english, translate, what) {
    for (let attempt = 1; attempt <= 2; attempt++) {
        const out = stripFences(await translate());
        if (!out) throw new Error(`empty translation (${what})`);
        if (!untranslated(english, out)) return out;
        console.warn(`[translations] ${what} attempt ${attempt}: came back in English`);
    }
    throw new Error(`translation came back in English (${what})`);
}

/** True when the model handed back the English text instead of a translation. */
export function untranslated(englishHtml, translatedHtml) {
    const text = (html) => String(html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
    const english = text(englishHtml);
    // Very short text (an acronym, "NF1") can legitimately read the same.
    return english.length >= 20 && english === text(translatedHtml);
}

function stripFences(text) {
    return String(text ?? "").replace(/^\s*```[a-z]*\s*/i, "").replace(/\s*```\s*$/, "").trim();
}

/** Headings must match exactly; paragraphs, list items and styled spans may drift a little. */
export function structureProblem(sourceHtml, translatedHtml, lang) {
    const count = (html, re) => (String(html).match(re) || []).length;
    const text = (html) => String(html).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    // [label, pattern, fixed slack, proportional slack]
    const checks = [
        ["headings", /<h[1-6]\b/gi, 0, 0], // a missing heading means a missing section
        ["paragraphs", /<p\b/gi, 1, 0.1],
        ["list items", /<li\b/gi, 1, 0.1],
        ["styled elements", /\bclass="/gi, 2, 0.1],
    ];
    for (const [label, re, slack, pct] of checks) {
        const a = count(sourceHtml, re), b = count(translatedHtml, re);
        if (Math.abs(a - b) > Math.max(slack, Math.round(a * pct))) return `${label}: English ${a}, translation ${b}`;
    }
    // Truncation guard. Chinese runs far shorter in characters than English.
    const ratio = text(translatedHtml).length / Math.max(1, text(sourceHtml).length);
    const [min, max] = lang === "zh" ? [0.15, 1.2] : [0.6, 2.2];
    if (ratio < min || ratio > max) return `length ratio ${ratio.toFixed(2)} outside ${min}–${max}`;
    return null;
}
