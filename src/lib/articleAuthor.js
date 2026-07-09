/**
 * Article credit resolution.
 *
 * History: while HS Simplified was briefly de-affiliated from the HS
 * Foundation (June 2026), foundation-certified articles were re-credited at
 * render time to the paper's first author. The partnership was reinstated
 * (July 2026), so this is now a passthrough — the certifier displays exactly
 * as stored (e.g. "HS Foundation", with its photo/degree/affiliation).
 *
 * The hook is kept because ArticlesListPaginated + ArticlesSection still route
 * through it, and a future tenant may need a render-time credit swap again.
 *
 * Returns { name, replaced, avatarUrl } — replaced=false means render the
 * stored certifier unchanged.
 */
export function resolveArticleCredit(article, baseName) {
  return { name: (baseName ?? "").toString(), replaced: false, avatarUrl: null };
}
