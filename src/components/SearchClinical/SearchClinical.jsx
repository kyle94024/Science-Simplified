"use client";
import "./SearchClinical.scss";
import { ArrowRight, Search } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import useSearchStore from "@/store/useSearchStore";

const SEMANTIC_THRESHOLD = 20; // chars

const SearchClinical = ({ placeholder = "Search for clinical trials" }) => {
    const router = useRouter();
    const {
        searchQuery,
        setSearchQuery,
        setSemanticResults,
        setSemanticLoading,
        clearSemantic,
    } = useSearchStore();
    const debounceRef = useRef(null);
    const abortRef = useRef(null);

    const handleChange = (event) => {
        setSearchQuery(event.target.value);
    };

    const handleSearchSubmit = (event) => {
        event.preventDefault();
        if (searchQuery) {
            router.push(`/clinical-trials`);
        }
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
        <form onSubmit={handleSearchSubmit} className="search-articles">
            <div className="search-articles__bar">
                <Search className="search-articles__icon" />
                <Input
                    type="text"
                    placeholder={placeholder}
                    className="search-articles__input"
                    value={searchQuery}
                    onChange={handleChange}
                />
            </div>
            <Button className="search-articles__button" type="submit">
                <ArrowRight className="search-articles__button-icon" />
            </Button>
        </form>
    );
};

export default SearchClinical;
