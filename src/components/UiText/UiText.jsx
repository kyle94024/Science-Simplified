"use client";
import { useUiText } from "@/hooks/useUiText";

/**
 * Interface text placed by a server component, shown in the reader's language
 * (see src/lib/uiText). Text without a translation shows as-is.
 *   <UiText text={content.title} />
 *   <UiText text="About {name}" vars={{ name: tenant.name }} />
 */
export function UiText({ text, vars }) {
    const t = useUiText();
    return t(text, vars) ?? null;
}

/**
 * The same for trusted site copy that is HTML (sites.js / About defaults).
 * Renders `as` (default div) with the translated HTML inside.
 */
export function UiHtml({ html, as: Tag = "div", ...props }) {
    const t = useUiText();
    return <Tag {...props} dangerouslySetInnerHTML={{ __html: t(html) ?? "" }} />;
}
