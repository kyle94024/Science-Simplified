export const revalidate = 0;

import { query } from "@/lib/db";
import { SUPPORTED_LANGUAGES } from "@/lib/translationWarnings";
import {
    translateHtmlContent,
    translatePlainText,
} from "@/utils/apiHelpers";

const validLanguages = new Set(SUPPORTED_LANGUAGES.map((l) => l.code));

export async function GET(request, { params }) {
    try {
        const { id } = params;
        const { searchParams } = new URL(request.url);
        const lang = searchParams.get("lang");

        if (!lang || !validLanguages.has(lang)) {
            return Response.json(
                {
                    error: `Invalid language. Supported: ${[...validLanguages].join(", ")}`,
                },
                { status: 400 }
            );
        }

        const langInfo = SUPPORTED_LANGUAGES.find((l) => l.code === lang);

        // Check for cached translation
        const cached = await query(
            `SELECT translated_title, translated_summary, translated_innertext
             FROM article_translations
             WHERE article_id = $1 AND language = $2`,
            [id, lang]
        );

        if (cached.rows.length > 0) {
            return Response.json({
                language: lang,
                translated_title: cached.rows[0].translated_title,
                translated_summary: cached.rows[0].translated_summary,
                translated_innertext: cached.rows[0].translated_innertext,
                cached: true,
            });
        }

        // Fetch original article
        const article = await query(
            `SELECT title, summary, innertext FROM article WHERE id = $1`,
            [id]
        );

        if (article.rows.length === 0) {
            return Response.json(
                { error: "Article not found" },
                { status: 404 }
            );
        }

        const { title, summary, innertext } = article.rows[0];

        // Translate all three fields
        const [translatedTitle, translatedSummary, translatedInnertext] =
            await Promise.all([
                translatePlainText(title, lang, langInfo.name),
                summary
                    ? translateHtmlContent(summary, lang, langInfo.name)
                    : Promise.resolve(null),
                innertext
                    ? translateHtmlContent(innertext, lang, langInfo.name)
                    : Promise.resolve(null),
            ]);

        // Cache in DB (upsert)
        await query(
            `INSERT INTO article_translations
                (article_id, language, translated_title, translated_summary, translated_innertext)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (article_id, language) DO UPDATE SET
                translated_title = EXCLUDED.translated_title,
                translated_summary = EXCLUDED.translated_summary,
                translated_innertext = EXCLUDED.translated_innertext,
                created_at = NOW()`,
            [id, lang, translatedTitle, translatedSummary, translatedInnertext]
        );

        return Response.json({
            language: lang,
            translated_title: translatedTitle,
            translated_summary: translatedSummary,
            translated_innertext: translatedInnertext,
            cached: false,
        });
    } catch (error) {
        console.error("Error translating article:", error);
        return Response.json(
            { error: "Failed to translate article" },
            { status: 500 }
        );
    }
}
