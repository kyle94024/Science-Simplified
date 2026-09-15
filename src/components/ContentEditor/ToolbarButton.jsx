import { Loader2 } from "lucide-react";

/**
 * One toolbar control. Always type="button" — every editor lives inside a
 * <form>, and a bare <button> would submit it.
 *
 * `keepFocus` (default true) swallows mousedown so the editor keeps its
 * selection while the button is clicked, the way Word's ribbon behaves.
 */
export function ToolbarButton({
    icon: Icon,
    label,
    shortcut,
    active,
    disabled,
    busy,
    keepFocus = true,
    onClick,
}) {
    return (
        <button
            type="button"
            className="content-editor__button"
            aria-label={label}
            title={shortcut ? `${label} (${shortcut})` : label}
            aria-pressed={active === undefined ? undefined : !!active}
            aria-busy={busy || undefined}
            disabled={disabled}
            onMouseDown={keepFocus ? (e) => e.preventDefault() : undefined}
            onClick={onClick}
        >
            {busy ? (
                <Loader2 size={18} className="content-editor__spin" aria-hidden="true" />
            ) : (
                <Icon size={18} aria-hidden="true" />
            )}
        </button>
    );
}
