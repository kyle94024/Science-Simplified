import { tenant } from "@/lib/config";

/**
 * HS is now independent of the HS Foundation. Articles that were certified
 * under a "…Foundation" profile should visually credit the original paper's
 * FIRST author instead of the foundation. This is a render-time presentation
 * tweak only — the database (certifiedby / profile) is NOT changed.
 *
 * Returns { name, replaced }:
 *   - replaced=true means we swapped in the paper's first author; callers
 *     should drop the foundation's degree/affiliation/photo too.
 */
const FOUNDATION_RE = /foundation/i;

export function resolveArticleCredit(article, baseName) {
  const name = (baseName ?? "").toString();
  if (tenant.shortName === "HS" && FOUNDATION_RE.test(name)) {
    const authors = Array.isArray(article?.authors) ? article.authors : [];
    const first = authors.find((a) => a && a.toString().trim());
    if (first) return { name: first.toString().trim(), replaced: true };
  }
  return { name, replaced: false };
}
