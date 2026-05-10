// src/store/useSearchStore.js
import { create } from "zustand";

const useSearchStore = create((set) => ({
    searchQuery: "",
    setSearchQuery: (query) => set({ searchQuery: query }),

    // Semantic search state (used by clinical trials page)
    semanticResults: [],
    setSemanticResults: (results) => set({ semanticResults: results }),
    semanticLoading: false,
    setSemanticLoading: (loading) => set({ semanticLoading: loading }),
    clearSemantic: () => set({ semanticResults: [], semanticLoading: false }),
}));

export default useSearchStore;
