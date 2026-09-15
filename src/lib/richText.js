/**
 * Server-side (and client-side, for defence in depth) sanitizer for rich text.
 *
 * The allowlist deliberately MIRRORS the editor schema in
 * components/ContentEditor/extensions.js: everything the editor can emit is
 * allowed, and nothing the editor can't represent is. That invariant is what
 * lets an article survive load → edit → save without silently losing anything,
 * and scripts/richtext-roundtrip.mjs asserts it (sanitize(editorOutput) must be
 * a fixed point, and sanitize(raw) must keep the same text the editor keeps).
 *
 * The previous client-only allowlist was narrower than the toolbar — it
 * stripped strikethrough, blockquotes, images and every AI colour <span> on
 * both load and save — and no API route sanitized at all.
 *
 * Safe to import from API routes and client components alike (no DOM needed).
 */
import sanitizeHtml from "sanitize-html";

/** Only our own design vocabulary; Word/WordPress paste classes are dropped. */
export const KNOWN_CLASS_RE = /^apicss-[\w-]+$/;

export const RICH_TEXT_ALLOWED_TAGS = [
    // blocks
    "p", "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li", "blockquote", "hr", "pre",
    // inline
    "br", "strong", "b", "em", "i", "u", "s", "strike", "del",
    "sub", "sup", "code", "span", "a",
    // media
    "img",
];

export const RICH_TEXT_OPTIONS = {
    allowedTags: RICH_TEXT_ALLOWED_TAGS,
    allowedAttributes: {
        a: ["href", "target", "rel", "class"],
        img: ["src", "alt", "title", "width", "height", "class"],
        ol: ["start", "type", "class"], // typing "3. " makes <ol start="3">
        "*": ["class"],
    },
    allowedClasses: {
        "*": [KNOWN_CLASS_RE],
        code: [KNOWN_CLASS_RE, /^language-[\w-]+$/], // ``` js code blocks
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { img: ["http", "https"] }, // never base64 into the DB
    allowProtocolRelative: false,
    // Unknown tags (div, table, figcaption, o:p …) are removed but their text is
    // kept — the same thing the editor's parser does, so the two agree …
    disallowedTagsMode: "discard",
    // … except for these, whose text must go too. This is prosemirror-model's
    // ignoreTags list plus sanitize-html's own defaults: a legacy AI row that is
    // a whole HTML document must not surface its <title> as body text.
    nonTextTags: ["script", "style", "textarea", "option", "title", "head", "noscript", "object"],
};

/** Cheap test for "is this string HTML at all". */
export function looksLikeHtml(value) {
    return typeof value === "string" && /<[a-z][\s\S]*>/i.test(value);
}

/**
 * Sanitize one HTML string. Null/undefined pass through unchanged, and so does
 * plain text: a summary like "Blood & Cancer" that contains no tag is not
 * markup, and encoding it to "Blood &amp; Cancer" would then be escaped a
 * second time by the RSS feed and the partner embed. Nothing executable can
 * hide in a string with no "<letter" in it.
 */
export function sanitizeRichText(html) {
    if (html == null || !looksLikeHtml(html)) return html;
    return sanitizeHtml(String(html), RICH_TEXT_OPTIONS);
}

/**
 * The About page's editable sections (about_page_config.sections): only these
 * fields are rendered as HTML, so only these are sanitized. Every other string
 * (headings, step titles, team bios …) is plain text and left byte-identical —
 * a bio containing "a<b and c>d" must not be parsed as markup.
 */
export const ABOUT_HTML_FIELDS = {
    mission: ["body"],
    partnership: ["body"],
    process: ["description"],
    founderStory: ["story"],
    getInvolved: ["description"],
};

export function sanitizeAboutSections(sections) {
    if (!Array.isArray(sections)) return sections;
    return sections.map((section) => {
        const fields = ABOUT_HTML_FIELDS[section?.type];
        if (!fields || !section.content || typeof section.content !== "object") return section;
        const content = { ...section.content };
        for (const field of fields) {
            if (typeof content[field] === "string") content[field] = sanitizeRichText(content[field]);
        }
        return { ...section, content };
    });
}
