import { articlesExternalTakeover } from "@/lib/articlesExternal";

/**
 * When a tenant's articles are published on a partner site (HS → the HS
 * Foundation's research-summaries page), the partner's copies are the
 * canonical public ones. Mark our article pages noindex so search engines
 * send patients to the partner site instead of the (patient-hidden) internal
 * pages. The pages themselves stay fully accessible — RSS <guid> links,
 * legacy ?hsf-id= redirects, and admin review all still work.
 *
 * Only while the takeover is ON. With it off, articles are served here again
 * and should be indexed normally. Tenants with no partner site are unaffected.
 */
export async function generateMetadata() {
    if (articlesExternalTakeover) {
        return { robots: { index: false, follow: true } };
    }
    return {};
}

export default function ArticleDetailLayout({ children }) {
    return children;
}
