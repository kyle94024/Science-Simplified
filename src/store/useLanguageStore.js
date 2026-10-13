// src/store/useLanguageStore.js
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/** localStorage key holding the reader's language (zustand persist format). */
export const LANGUAGE_STORAGE_KEY = "ss-article-language";

/**
 * The reader's chosen language — articles and interface text — remembered in
 * localStorage so it survives refreshes and return visits. "en" (the
 * original) is the default.
 *
 * skipHydration: the saved value is applied after mount (useArticleLanguage
 * calls rehydrate), never during the first render — so the server-rendered
 * English page and the browser's first render always agree.
 */
const useLanguageStore = create(
    persist(
        (set) => ({
            language: "en",
            hydrated: false,
            setLanguage: (language) => set({ language }),
        }),
        {
            name: LANGUAGE_STORAGE_KEY,
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({ language: state.language }),
            skipHydration: true,
            // Runs whether or not storage could be read (e.g. blocked cookies).
            onRehydrateStorage: () => () => useLanguageStore.setState({ hydrated: true }),
        }
    )
);

/** The saved language read straight from storage (before the store rehydrates), or null. */
export function readSavedLanguage() {
    try {
        return JSON.parse(localStorage.getItem(LANGUAGE_STORAGE_KEY))?.state?.language ?? null;
    } catch {
        return null;
    }
}

export default useLanguageStore;
