"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, X } from "lucide-react";

/**
 * Debounced search input component
 * @param {Object} props
 * @param {string} props.value - Controlled value
 * @param {function} props.onChange - Change handler
 * @param {string} [props.placeholder] - Placeholder text
 * @param {number} [props.debounceMs] - Debounce delay in ms
 * @param {string} [props.className] - Additional wrapper classes
 */
export default function SearchInput({
    value,
    onChange,
    placeholder = "Search...",
    debounceMs = 300,
    className = ""
}) {
    const [localValue, setLocalValue] = useState(value);

    // Sync with external value
    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    // Debounced change handler
    useEffect(() => {
        const timer = setTimeout(() => {
            if (localValue !== value) {
                onChange(localValue);
            }
        }, debounceMs);

        return () => clearTimeout(timer);
    }, [localValue, debounceMs, onChange, value]);

    const handleClear = useCallback(() => {
        setLocalValue("");
        onChange("");
    }, [onChange]);

    return (
        <div className={`search-input-wrapper ${className}`}>
            <Search size={18} className="search-input-icon" />
            <input
                type="text"
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                placeholder={placeholder}
                className="search-input"
            />
            {localValue && (
                <button
                    type="button"
                    onClick={handleClear}
                    className="search-input-clear"
                    aria-label="Clear search"
                >
                    <X size={16} />
                </button>
            )}
        </div>
    );
}
