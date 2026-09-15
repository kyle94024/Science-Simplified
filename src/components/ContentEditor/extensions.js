/**
 * The editor's document model — the single source of truth for what content
 * survives a round-trip through the editor.
 *
 * Framework-free on purpose: no React, no styles. It is imported by the React
 * shell (Editor.jsx), by the server-side sanitizer allowlist (lib/richText.js
 * mirrors it), and by scripts/richtext-roundtrip.mjs, which parses every stored
 * article through this schema to prove nothing is lost.
 *
 * Three dialects of stored HTML have to survive intact:
 *   - AI output      <div class="apicss-body"> <h2 class="apicss-heading-secondary">
 *                    <p class="apicss-paragraph"> <span class="apicss-text-success">
 *   - docx import    same classes via mammoth, plus <span class="apicss-underline">, <s>
 *   - hand-written   plain <p>/<ul>/<strong> from the editor itself
 * Word/WordPress paste junk (class="MsoNormal", "has-normal-font-size", inline
 * style=…) is deliberately dropped: nothing in the app styles it.
 */
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { Extension, Mark } from "@tiptap/core";

/** Only our own design vocabulary survives. Anything else is paste debris. */
export const KNOWN_CLASS_RE = /^apicss-[\w-]+$/;

export function keepKnownClasses(value) {
    if (!value) return null;
    const kept = String(value)
        .split(/\s+/)
        .filter((c) => KNOWN_CLASS_RE.test(c));
    return kept.length ? kept.join(" ") : null;
}

const classAttribute = {
    default: null,
    parseHTML: (el) => keepKnownClasses(el.getAttribute("class")),
    renderHTML: (attrs) => (attrs.class ? { class: attrs.class } : {}),
};

/**
 * Nodes and marks keep their `class` (AI/docx apicss-* classes) through a
 * round-trip — e.g. <strong class="apicss-strong"> from the docx importer.
 * `link` and `image` are handled below: they need a default class, so they
 * carry their own filtered attribute instead.
 */
export const PreserveClasses = Extension.create({
    name: "preserveClasses",
    addGlobalAttributes() {
        return [
            {
                types: [
                    "paragraph",
                    "heading",
                    "blockquote",
                    "bulletList",
                    "orderedList",
                    "listItem",
                    "horizontalRule",
                    "codeBlock",
                    "bold",
                    "italic",
                    "strike",
                    "underline",
                    "code",
                    "subscript",
                    "superscript",
                ],
                attributes: { class: classAttribute },
            },
        ];
    },
});

/** A `class` attribute with a default: known classes are kept, junk falls back. */
const classAttributeWithDefault = (fallback) => ({
    default: fallback,
    parseHTML: (el) => keepKnownClasses(el.getAttribute("class")) || fallback,
    renderHTML: (attrs) => ({ class: attrs.class || fallback }),
});

/** Links always render as .apicss-link; a pasted <a class="MsoHyperlink"> is cleaned. */
export const RichLink = Link.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            class: classAttributeWithDefault("apicss-link"),
        };
    },
}).configure({
    openOnClick: false, // clicking a link in the editor edits it, never navigates
    autolink: true,
    linkOnPaste: true,
    HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
    // Mirror lib/richText.js (http, https, mailto): TipTap's default also admits
    // tel:/sms:/ftp:, which the server would strip on save — the editor must
    // never accept a link the API destroys. Scheme-less input ("example.org")
    // still passes through TipTap's own validation.
    isAllowedUri: (url, ctx) => {
        const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(url)?.[1]?.toLowerCase();
        if (scheme && !["http", "https", "mailto"].includes(scheme)) return false;
        return ctx.defaultValidate(url);
    },
});

/** Images always render as .apicss-image. Base64 is refused: a pasted/dropped
 *  image must go through /api/images/upload-image and come back as a URL,
 *  otherwise megabytes land in the DB. */
export const RichImage = Image.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            class: classAttributeWithDefault("apicss-image"),
        };
    },
}).configure({
    inline: false,
    allowBase64: false,
});

/**
 * Inline <span class="apicss-…">: the AI's colour highlights and the docx
 * importer's underline. A span with no known class simply unwraps, so Word
 * paste (<span style="…">, <span class="MsoHyperlink">) leaves clean text.
 */
export const StyledSpan = Mark.create({
    name: "styledSpan",
    addAttributes() {
        return { class: classAttribute };
    },
    parseHTML() {
        return [
            {
                tag: "span",
                getAttrs: (el) =>
                    keepKnownClasses(el.getAttribute("class")) ? null : false,
            },
        ];
    },
    renderHTML({ HTMLAttributes }) {
        return ["span", HTMLAttributes, 0];
    },
});

/**
 * Word-style list indentation.
 *
 * ProseMirror can only nest a list item under a *previous* sibling, so Tab on
 * the first bullet used to return false — the key then fell through to the
 * browser and moved focus out of the editor, which is what "indent doesn't
 * work" looked like to editors. Inside a list, Tab and Shift-Tab are now
 * always consumed: indent/outdent when possible, otherwise do nothing but keep
 * focus. Outside a list, Tab keeps its normal focus-navigation meaning.
 * Mod-] / Mod-[ mirror the toolbar buttons (Google Docs' shortcuts).
 */
export const ListIndentKeys = Extension.create({
    name: "listIndentKeys",
    priority: 1000,
    addKeyboardShortcuts() {
        const inList = () => this.editor.isActive("listItem");
        const indent = () =>
            inList() ? this.editor.commands.sinkListItem("listItem") || true : false;
        const outdent = () =>
            inList() ? this.editor.commands.liftListItem("listItem") || true : false;
        return {
            Tab: indent,
            "Shift-Tab": outdent,
            "Mod-]": indent,
            "Mod-[": outdent,
        };
    },
});

/** Everything the editor understands. `variant` only changes UI, never the schema. */
export function createExtensions() {
    return [
        StarterKit.configure({
            heading: { levels: [1, 2, 3, 4, 5, 6] },
            // Base64 images are refused (see Image below); the rest of StarterKit
            // — lists, blockquote, hr, code, hard break, history — is wanted as-is.
        }),
        Underline,
        // Scientific notation — FEV<sub>1</sub>, m<sup>2</sup> — appears in real
        // articles; in the schema (Mod-, / Mod-.) but deliberately not on the toolbar.
        Subscript,
        Superscript,
        RichLink,
        RichImage,
        PreserveClasses,
        StyledSpan,
        ListIndentKeys,
    ];
}

export default createExtensions;
