import { NextResponse } from "next/server";
import { getTranslationOverlay, isSupportedLanguage } from "@/lib/articleTranslations";

export const revalidate = 0;

/**
 * GET /api/articles/translations?lang=es
 *
 * Translated title + summary of every published article that has an
 * up-to-date translation in that language, keyed by article id — the overlay
 * article lists (home page, /articles) apply to their cards when a reader picks
 * a language. Articles without a current translation are simply absent, so
 * their cards stay in English.
 */
export async function GET(request) {
    const lang = new URL(request.url).searchParams.get("lang");
    if (!isSupportedLanguage(lang)) {
        return NextResponse.json({ error: "Unsupported language" }, { status: 400 });
    }
    try {
        const translations = await getTranslationOverlay(lang);
        return NextResponse.json(
            { language: lang, translations },
            // Readers switch languages often; a minute of edge caching keeps it instant.
            { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
        );
    } catch (error) {
        console.error("Error loading translation overlay:", error);
        return NextResponse.json({ error: "Failed to load translations" }, { status: 500 });
    }
}
