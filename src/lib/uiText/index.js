/**
 * Interface text in the reader's chosen language — the site-wide language
 * picker on tenants with `articleTranslations` (NF). Articles are translated
 * separately (src/lib/articleTranslations.js); this covers everything around
 * them: navigation, headings, buttons, labels, messages, site copy.
 *
 * English is the source. Components write the English and look it up:
 *     const t = useUiText();                      // src/hooks/useUiText.js
 *     t("Clinical Trials")                        // "Ensayos clínicos" for a Spanish reader
 *     t("About {name}", { name: tenant.name })    // names stay as they are
 * Each language is a dictionary from that English to its translation
 * (./es.js, ./fr.js, …). Text without an entry shows in English, so a missing
 * or outdated translation never breaks a page, and tenants without the
 * picker render exactly the English they always did.
 *
 * Dictionaries are separate chunks, loaded only for the language in use.
 * `npm run ui-text:check` lists text a language is missing.
 */
import { create } from "zustand";
import { tenant } from "@/lib/config";
import { readSavedLanguage } from "@/store/useLanguageStore";

const LOADERS = {
    es: () => import("./es"),
    fr: () => import("./fr"),
    de: () => import("./de"),
    zh: () => import("./zh"),
    pt: () => import("./pt"),
};

/** Dictionaries loaded so far, and languages whose dictionary couldn't be loaded. */
export const useUiDictionaries = create(() => ({ loaded: {}, failed: {} }));

const loading = {};

/** Load one language's dictionary (once). Resolves to it, or null on failure; never rejects. */
export function loadUiDictionary(lang) {
    if (!LOADERS[lang]) return Promise.resolve(null);
    if (!loading[lang]) {
        loading[lang] = LOADERS[lang]()
            .then((mod) => {
                useUiDictionaries.setState((s) => ({
                    loaded: { ...s.loaded, [lang]: mod.default },
                    failed: { ...s.failed, [lang]: false },
                }));
                return mod.default;
            })
            .catch((err) => {
                console.error(`[ui-text] couldn't load the ${lang} dictionary:`, err);
                delete loading[lang]; // let a later switch try again
                useUiDictionaries.setState((s) => ({ failed: { ...s.failed, [lang]: true } }));
                return null;
            });
    }
    return loading[lang];
}

/**
 * Marks English as interface text where it's defined outside a component
 * (option lists, label maps) — returns it unchanged. Translate it where it's
 * rendered: t(option.label). The marker lets `npm run ui-text:check` find it.
 */
export const uiText = (text) => text;

/** `text` from `dictionary` (as-is when it has no entry), with {placeholders} filled from `vars`. */
export function translateUi(dictionary, text, vars) {
    let out = text;
    if (dictionary && typeof text === "string" && Object.prototype.hasOwnProperty.call(dictionary, text)) {
        out = dictionary[text];
    }
    if (vars && typeof out === "string") {
        out = out.replace(/\{(\w+)\}/g, (match, key) => (vars[key] == null ? match : String(vars[key])));
    }
    return out;
}

// A returning reader's dictionary starts downloading as soon as this module
// runs — alongside hydration — instead of after the first render.
if (typeof window !== "undefined" && tenant?.articleTranslations) {
    const saved = readSavedLanguage();
    if (saved && saved !== "en") loadUiDictionary(saved);
}
