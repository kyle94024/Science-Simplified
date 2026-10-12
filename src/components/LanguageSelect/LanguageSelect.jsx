"use client";
import { Globe } from "lucide-react";
import { SUPPORTED_LANGUAGES } from "@/lib/translationWarnings";
import { useArticleLanguage } from "@/hooks/useArticleLanguage";
import "./LanguageSelect.scss";

/**
 * Site-wide article language picker (navbar). Renders nothing on tenants
 * without pre-translated articles. The choice persists across visits.
 */
export default function LanguageSelect({ className = "" }) {
    const { enabled, language, setLanguage } = useArticleLanguage();
    if (!enabled) return null;

    return (
        <label className={`language-select ${className}`} title="Read articles in another language">
            <Globe size={16} aria-hidden="true" />
            <span className="language-select__sr">Article language</span>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} aria-label="Article language">
                <option value="en">English</option>
                {SUPPORTED_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code} lang={l.code}>
                        {l.nativeName}
                    </option>
                ))}
            </select>
        </label>
    );
}
