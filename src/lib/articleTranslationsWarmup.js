import { after } from "next/server";
import { translationsEnabled, warmArticleTranslations } from "@/lib/articleTranslations";

/**
 * After the response is sent, bring an article's stored translations up to
 * date — on tenants that pre-translate (sites.js `articleTranslations`). Used by
 * the publish and edit routes. Best effort: if it doesn't finish, the first
 * reader of that language generates the translation on demand instead.
 */
export function scheduleTranslationWarmup(articleId) {
    if (!translationsEnabled || !articleId) return;
    after(() => warmArticleTranslations(articleId));
}
