export const revalidate = 0;
// A first-time translation runs three model calls (title, summary, body).
export const maxDuration = 60;

import { ensureArticleTranslation, isSupportedLanguage, LANGUAGE_CODES } from "@/lib/articleTranslations";

/**
 * GET /api/articles/:id/translate?lang=es
 *
 *   200  the current translation (from storage, or generated now and stored)
 *   202  { status: "pending" } — another request is generating it; retry shortly
 *   400  unsupported language / bad id      404  no such article
 *
 * A translation is served only while it matches the article's current English
 * text (see src/lib/articleTranslations.js), so edits never show stale content.
 */
export async function GET(request, { params }) {
    const { id } = await params;
    const lang = new URL(request.url).searchParams.get("lang");

    if (!isSupportedLanguage(lang)) {
        return Response.json({ error: `Invalid language. Supported: ${LANGUAGE_CODES.join(", ")}` }, { status: 400 });
    }
    const articleId = Number(id);
    if (!Number.isInteger(articleId) || articleId <= 0) {
        return Response.json({ error: "Invalid article id" }, { status: 400 });
    }

    try {
        const result = await ensureArticleTranslation(articleId, lang);
        if (result.status === "not_found") {
            return Response.json({ error: "Article not found" }, { status: 404 });
        }
        if (result.status === "pending") {
            return Response.json({ status: "pending", language: lang }, { status: 202, headers: { "Retry-After": "3" } });
        }
        const { translated_title, translated_summary, translated_innertext } = result.translation;
        return Response.json({
            language: lang,
            translated_title,
            translated_summary,
            translated_innertext,
            cached: result.cached,
        });
    } catch (error) {
        console.error("Error translating article:", error);
        return Response.json({ error: "Failed to translate article" }, { status: 500 });
    }
}
