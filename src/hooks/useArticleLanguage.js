"use client";
import { useEffect } from "react";
import { tenant } from "@/lib/config";
import { SUPPORTED_LANGUAGES } from "@/lib/translationWarnings";
import useLanguageStore from "@/store/useLanguageStore";

const CODES = new Set(SUPPORTED_LANGUAGES.map((l) => l.code));

/**
 * The site-wide article language. Only tenants with `articleTranslations`
 * (NF) have it; elsewhere this is always English.
 *
 *   language  "en" or a supported code ("es", "zh", …)
 *   ready     the saved choice has been loaded — wait for it before fetching,
 *             so a returning Spanish reader doesn't load English first
 */
export function useArticleLanguage() {
    const enabled = !!tenant?.articleTranslations;
    const stored = useLanguageStore((s) => s.language);
    const hydrated = useLanguageStore((s) => s.hydrated);
    const setLanguage = useLanguageStore((s) => s.setLanguage);

    useEffect(() => {
        if (enabled && !useLanguageStore.getState().hydrated) useLanguageStore.persist.rehydrate();
    }, [enabled]);

    // A language we no longer offer falls back to English.
    const language = enabled && CODES.has(stored) ? stored : "en";
    return { enabled, ready: !enabled || hydrated, language, setLanguage };
}
