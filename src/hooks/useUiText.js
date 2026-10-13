"use client";
import { cloneElement, isValidElement, useEffect, useMemo } from "react";
import { useArticleLanguage } from "@/hooks/useArticleLanguage";
import { loadUiDictionary, translateUi, useUiDictionaries } from "@/lib/uiText";

/**
 * `t` for interface text in the reader's language (see src/lib/uiText).
 *
 *   const t = useUiText();
 *   t("Read more")                              // "Leer más"
 *   t("Page {page} of {total}", { page, total })
 *
 * t.rich keeps a sentence with a link (or other element) in one piece, so
 * each language can put the element where its grammar needs it:
 *   t.rich("Back to {link}", { link: <a href="/login">{t("Login")}</a> })
 *
 * t.lang is the language the text is actually shown in — "en" until that
 * language's dictionary has loaded — for lang attributes and date formats.
 * On tenants without the language picker t returns the English unchanged.
 */
export function useUiText() {
    const { language } = useArticleLanguage();
    const dictionary = useUiDictionaries((s) => (language === "en" ? null : s.loaded[language] || null));

    useEffect(() => {
        if (language !== "en") loadUiDictionary(language);
    }, [language]);

    return useMemo(() => {
        const t = (text, vars) => translateUi(dictionary, text, vars);
        t.rich = (text, vars = {}) =>
            String(translateUi(dictionary, text))
                .split(/(\{\w+\})/)
                .filter(Boolean)
                .map((part, i) => {
                    const key = /^\{(\w+)\}$/.exec(part)?.[1];
                    if (!key || vars[key] == null) return part;
                    return isValidElement(vars[key]) ? cloneElement(vars[key], { key: i }) : String(vars[key]);
                });
        t.lang = dictionary ? language : "en";
        return t;
    }, [dictionary, language]);
}
