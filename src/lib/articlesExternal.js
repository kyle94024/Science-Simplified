import { tenant } from "@/lib/config";

/**
 * Partner site where this tenant's articles are published, or null.
 * (HS → the HS Foundation's research-summaries page.)
 */
export const articlesExternalUrl = tenant.articlesExternalUrl || null;

/**
 * Whether the partner site currently *replaces* the on-site article surfaces
 * for patients — the "takeover":
 *
 *   on  → patients get a pointer card instead of listings/search, the navbar
 *         and footer "Articles" links go to the partner, and article detail
 *         pages are noindex'd. Staff keep the internal surfaces.
 *   off → articles are shown here normally for everyone; the partner link
 *         stays as a small corner pill so the pointer is still available.
 *
 * Defaults to ON whenever a partner URL exists (preserving prior behavior).
 * A tenant opts out with `articlesExternalTakeover: false` in sites.js — that
 * keeps the URL, partner name, disclaimer copy and all wiring intact so the
 * takeover can be switched back on by flipping one flag.
 */
export const articlesExternalTakeover =
    !!articlesExternalUrl && tenant.articlesExternalTakeover !== false;
