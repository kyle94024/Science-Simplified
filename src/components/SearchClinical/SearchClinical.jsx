"use client";
import "./SearchClinical.scss";
import { Search, X } from "lucide-react";
import { useEffect, useRef } from "react";
import useSearchStore from "@/store/useSearchStore";
import { useUiText } from "@/hooks/useUiText";

const SEMANTIC_THRESHOLD = 20; // chars

/**
 * Search box for the clinical trials page. Typing filters the list as you go
 * (keyword matching happens on the page); descriptions of SEMANTIC_THRESHOLD+
 * characters also fetch the closest matches by meaning.
 */
const SearchClinical = ({ placeholder }) => {
    const t = useUiText();
    const {
        searchQuery,
        setSearchQuery,
        setSemanticResults,
        setSemanticLoading,
        clearSemantic,
    } = useSearchStore();
    const debounceRef = useRef(null);
    const abortRef = useRef(null);
    const inputRef = useRef(null);
    const label = placeholder ?? t("Search for clinical trials");

    const clear = () => {
        setSearchQuery("");
        inputRef.current?.focus();
    };

    // Debounced semantic search trigger for long queries
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (abortRef.current) abortRef.current.abort();

        const trimmed = (searchQuery || "").trim();
        if (trimmed.length < SEMANTIC_THRESHOLD) {
            // Below threshold: clear any prior semantic results, fall through to substring filter
            clearSemantic();
            return;
        }

        debounceRef.current = setTimeout(async () => {
            setSemanticLoading(true);
            try {
                abortRef.current = new AbortController();
                const res = await fetch("/api/clinical-trials/search", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ query: trimmed }),
                    signal: abortRef.current.signal,
                });
                const data = await res.json();
                if (data.success) {
                    setSemanticResults(data.trials || []);
                } else {
                    console.warn("Semantic search failed:", data.error);
                    setSemanticResults([]);
                }
            } catch (err) {
                if (err.name !== "AbortError") {
                    console.error("Semantic search error:", err);
                }
            } finally {
                setSemanticLoading(false);
            }
        }, 350);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [searchQuery, setSemanticResults, setSemanticLoading, clearSemantic]);

    return (
        // Results update as you type, so submitting (Enter) has nothing left to do.
        <form role="search" className="trial-search" onSubmit={(e) => e.preventDefault()}>
            <Search className="trial-search__icon" size={20} aria-hidden="true" />
            <input
                ref={inputRef}
                type="search"
                className="trial-search__input"
                placeholder={label}
                aria-label={label}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Escape" && searchQuery) {
                        e.preventDefault();
                        clear();
                    }
                }}
                autoComplete="off"
                spellCheck={false}
            />
            {searchQuery && (
                <button type="button" className="trial-search__clear" onClick={clear} aria-label={t("Clear search")}>
                    <X size={18} aria-hidden="true" />
                </button>
            )}
        </form>
    );
};

export default SearchClinical;
