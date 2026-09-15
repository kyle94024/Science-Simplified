import { ChevronDown } from "lucide-react";

/**
 * "Normal text / Heading 1–3" as a styled native <select>: fully keyboard
 * accessible for free. Headings 4–6 stay in the schema (AI and docx content
 * uses them) but are not offered here; a block the menu doesn't cover shows
 * as "Other".
 */
export const BLOCK_STYLES = [
    { value: "paragraph", label: "Normal text" },
    { value: "1", label: "Heading 1" },
    { value: "2", label: "Heading 2" },
    { value: "3", label: "Heading 3" },
];

export function BlockStyleSelect({ value, disabled, onChange }) {
    const known = BLOCK_STYLES.some((style) => style.value === value);

    return (
        <span className="content-editor__select">
            <select
                aria-label="Block style"
                title="Block style"
                value={known ? value : "other"}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value)}
            >
                {!known && (
                    <option value="other" disabled>
                        Other
                    </option>
                )}
                {BLOCK_STYLES.map((style) => (
                    <option key={style.value} value={style.value}>
                        {style.label}
                    </option>
                ))}
            </select>
            <ChevronDown size={14} aria-hidden="true" />
        </span>
    );
}
