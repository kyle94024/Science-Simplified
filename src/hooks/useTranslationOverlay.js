"use client";
import { useEffect, useState } from "react";

// One request per language per page load; switching back and forth is instant.
const cache = new Map();

function loadOverlay(language) {
    if (!cache.has(language)) {
        cache.set(
            language,
            fetch(`/api/articles/translations?lang=${encodeURIComponent(language)}`)
                .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
                .then((data) => data.translations || {})
                .catch((err) => {
                    cache.delete(language); // let a later switch retry
                    throw err;
                })
        );
    }
    return cache.get(language);
}

/**
 * Translated titles/summaries for article cards in `language`, keyed by
 * article id. Articles without an up-to-date translation are absent from the
 * map and keep their English text.
 *
 *   overlay  the map, or null (English, not ready yet, or failed)
 *   loading  true while a non-English overlay is on its way — lists show their
 *            skeleton instead of flashing English cards first
 */
export function useTranslationOverlay(language, ready = true) {
    const wanted = ready && language !== "en" ? language : null;
    const [state, setState] = useState({ language: null, overlay: null, failed: false });

    useEffect(() => {
        if (!wanted) return;
        let cancelled = false;
        loadOverlay(wanted)
            .then((map) => { if (!cancelled) setState({ language: wanted, overlay: map, failed: false }); })
            .catch((err) => {
                console.error("Could not load translations:", err);
                if (!cancelled) setState({ language: wanted, overlay: null, failed: true }); // English fallback
            });
        return () => { cancelled = true; };
    }, [wanted]);

    if (!wanted) return { overlay: null, loading: !ready };
    if (state.language !== wanted) return { overlay: null, loading: true };
    return { overlay: state.overlay, loading: false };
}

/** Cards in the reader's language where a translation exists; English otherwise. */
export function applyTranslationOverlay(articles, overlay, language) {
    if (!overlay || !Array.isArray(articles)) return articles;
    return articles.map((a) => {
        const t = overlay[a.id];
        return t ? { ...a, title: t.title || a.title, summary: t.summary ?? a.summary, translatedLanguage: language } : a;
    });
}
