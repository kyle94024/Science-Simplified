"use client";
import { useEffect } from "react";
import { useArticleLanguage } from "@/hooks/useArticleLanguage";
import { loadUiDictionary, useUiDictionaries } from "@/lib/uiText";
import { PENDING_CLASS } from "@/lib/uiText/boot";

/**
 * Applies the reader's language to the page as a whole (root layout, tenants
 * with the language picker): loads the saved choice and its interface text,
 * keeps <html lang> in step, and reveals the page the <head> boot script hid
 * (src/lib/uiText/boot.js) once its text is in that language.
 */
export default function LanguageBoot() {
    const { enabled, ready, language } = useArticleLanguage();
    // Settled = the text on screen is final: English, or this language's
    // dictionary has loaded (or failed to, in which case English stays).
    const settled = useUiDictionaries((s) => language === "en" || !!s.loaded[language] || !!s.failed[language]);
    const shown = useUiDictionaries((s) => (language !== "en" && s.loaded[language] ? language : "en"));

    useEffect(() => {
        if (enabled && language !== "en") loadUiDictionary(language);
    }, [enabled, language]);

    useEffect(() => {
        if (!enabled || !ready || !settled) return;
        document.documentElement.lang = shown;
        document.documentElement.classList.remove(PENDING_CLASS);
    }, [enabled, ready, settled, shown]);

    return null;
}
