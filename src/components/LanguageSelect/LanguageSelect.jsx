"use client";
import { Globe } from "lucide-react";
import { SUPPORTED_LANGUAGES } from "@/lib/translationWarnings";
import { useArticleLanguage } from "@/hooks/useArticleLanguage";
import { useUiText } from "@/hooks/useUiText";
import { loadUiDictionary } from "@/lib/uiText";
import "./LanguageSelect.scss";

// Fetch every language's interface text as the reader reaches for the picker,
// so the switch itself is instant.
const preloadAll = () => SUPPORTED_LANGUAGES.forEach((l) => loadUiDictionary(l.code));

/**
 * Site-wide language picker (navbar): articles and interface text switch
 * together. Renders nothing on tenants without pre-translated articles. The
 * choice persists across visits.
 */
export default function LanguageSelect({ className = "" }) {
    const { enabled, language, setLanguage } = useArticleLanguage();
    const t = useUiText();
    if (!enabled) return null;

    return (
        <label className={`language-select ${className}`} title={t("Choose a language")}>
            <Globe size={16} aria-hidden="true" />
            <span className="language-select__sr">{t("Language")}</span>
            <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                onFocus={preloadAll}
                onPointerDown={preloadAll}
                aria-label={t("Language")}
            >
                <option value="en" lang="en">English</option>
                {SUPPORTED_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code} lang={l.code}>
                        {l.nativeName}
                    </option>
                ))}
            </select>
        </label>
    );
}
