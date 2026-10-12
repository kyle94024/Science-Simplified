// src/store/useLanguageStore.js
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * The reader's chosen article language, remembered in localStorage so it
 * survives refreshes and return visits. "en" (the original) is the default.
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
            name: "ss-article-language",
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({ language: state.language }),
            skipHydration: true,
            // Runs whether or not storage could be read (e.g. blocked cookies).
            onRehydrateStorage: () => () => useLanguageStore.setState({ hydrated: true }),
        }
    )
);

export default useLanguageStore;
