import { tenant } from "@/lib/config";

/**
 * When a tenant's articles are published on a partner site (HS → the HS
 * Foundation's research-summaries page), the partner's copies are the
 * canonical public ones. Mark our article pages noindex so search engines
 * send patients to the partner site instead of the (patient-hidden) internal
 * pages. The pages themselves stay fully accessible — RSS <guid> links,
 * legacy ?hsf-id= redirects, and admin review all still work.
 *
 * Tenants without articlesExternalUrl are unaffected (indexable as before).
 */
export async function generateMetadata() {
    if (tenant.articlesExternalUrl) {
        return { robots: { index: false, follow: true } };
    }
    return {};
}

export default function ArticleDetailLayout({ children }) {
    return children;
}
