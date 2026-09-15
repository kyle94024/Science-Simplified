import { useEffect, useRef, useState } from "react";
import { Check, ExternalLink, Pencil, Trash2, X } from "lucide-react";

const ALLOWED_SCHEMES = ["http", "https", "mailto"];
const EMAIL_RE = /^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/;

/**
 * "example.org/page" → "https://example.org/page", "me@example.org" →
 * "mailto:me@example.org". Anything that isn't http(s)/mailto — javascript:,
 * data:, file: — returns null and is refused.
 */
export function normalizeUrl(raw) {
    let value = String(raw ?? "").trim();
    if (!value) return null;

    const scheme = value.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase();
    if (scheme && !/^[a-z0-9.-]+:\d+(\/|$)/i.test(value)) {
        // A real scheme (not "localhost:3000/…", which is a host and port).
        if (!ALLOWED_SCHEMES.includes(scheme)) return null;
    } else if (scheme) {
        value = `https://${value}`;
    } else if (EMAIL_RE.test(value)) {
        value = `mailto:${value}`;
    } else {
        value = `https://${value.replace(/^\/+/, "")}`;
    }

    try {
        new URL(value);
    } catch {
        return null;
    }
    return value;
}

/**
 * The inline link editor shown in the bubble menu.
 *
 * `href` is the existing link's URL, or null for a brand-new link (the editor
 * then opens straight into the input, as it does when `autoEdit` is set).
 * Enter applies, Escape cancels.
 */
export function LinkEditor({ href, autoEdit = false, onSubmit, onRemove, onCancel }) {
    const isNew = href == null;
    const [editing, setEditing] = useState(isNew || autoEdit);
    const [value, setValue] = useState(href ?? "");
    const [error, setError] = useState(null);
    const inputRef = useRef(null);

    useEffect(() => {
        if (editing) inputRef.current?.focus();
    }, [editing]);

    function apply() {
        const url = normalizeUrl(value);
        if (!url) {
            setError("Enter a web address (http, https or mailto).");
            inputRef.current?.focus();
            return;
        }
        setError(null);
        setEditing(false);
        onSubmit(url);
    }

    function cancel() {
        setError(null);
        if (isNew) {
            onCancel();
        } else {
            setValue(href);
            setEditing(false);
        }
    }

    function onKeyDown(e) {
        if (e.key === "Enter") {
            e.preventDefault();
            apply();
        } else if (e.key === "Escape") {
            e.preventDefault();
            cancel();
        }
    }

    if (editing) {
        return (
            <div className="content-editor__link" role="group" aria-label="Edit link">
                <input
                    ref={inputRef}
                    className="content-editor__link-input"
                    type="text"
                    inputMode="url"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="Paste or type a link"
                    aria-label="Link address"
                    aria-invalid={error ? true : undefined}
                    value={value}
                    onChange={(e) => {
                        setValue(e.target.value);
                        if (error) setError(null);
                    }}
                    onKeyDown={onKeyDown}
                />
                <button
                    type="button"
                    className="content-editor__link-action"
                    aria-label="Apply link"
                    title="Apply (Enter)"
                    onClick={apply}
                >
                    <Check size={16} aria-hidden="true" />
                </button>
                <button
                    type="button"
                    className="content-editor__link-action"
                    aria-label="Cancel"
                    title="Cancel (Esc)"
                    onClick={cancel}
                >
                    <X size={16} aria-hidden="true" />
                </button>
                {error && (
                    <p className="content-editor__link-error" role="alert">
                        {error}
                    </p>
                )}
            </div>
        );
    }

    return (
        <div className="content-editor__link" role="group" aria-label="Link">
            <span className="content-editor__link-url" title={href}>
                {href}
            </span>
            <button
                type="button"
                className="content-editor__link-action"
                onClick={() => setEditing(true)}
            >
                <Pencil size={14} aria-hidden="true" />
                Edit
            </button>
            <a
                className="content-editor__link-action"
                href={href}
                target="_blank"
                rel="noopener noreferrer"
            >
                <ExternalLink size={14} aria-hidden="true" />
                Open
            </a>
            <button
                type="button"
                className="content-editor__link-action"
                onClick={onRemove}
            >
                <Trash2 size={14} aria-hidden="true" />
                Remove
            </button>
        </div>
    );
}
