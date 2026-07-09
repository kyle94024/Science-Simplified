"use client";

import { ExternalLink, BookOpen, ArrowRight } from "lucide-react";
import { tenant } from "@/lib/config";
import "./ExternalArticlesNotice.scss";

/**
 * Shown when a tenant's articles are published on a partner site
 * (tenant.articlesExternalUrl — e.g. HS → the HS Foundation's
 * research-summaries page).
 *
 * variant="full"    — section-sized card that REPLACES article listings for
 *                     patients (home + /articles).
 * variant="hero"    — standalone fancy CTA button for the home hero
 *                     (patient view, in place of the search bar).
 * variant="compact" — small inline link-button; shown above the listings for
 *                     admins so the outbound path is always one click away.
 *
 * Renders nothing if the tenant has no external articles URL.
 */
export default function ExternalArticlesNotice({ variant = "full" }) {
    const url = tenant.articlesExternalUrl;
    if (!url) return null;

    const partner = tenant.articlesExternalPartner || "our partner organization";
    // Label shows just the host ("hs-foundation.org") — the link keeps the full path.
    const displayHost = url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0];

    if (variant === "compact") {
        return (
            <a
                className="external-articles-notice__compact"
                href={url}
                target="_blank"
                rel="noopener noreferrer"
            >
                <ExternalLink size={14} />
                <span>
                    Published summaries live on the {partner} site
                </span>
            </a>
        );
    }

    if (variant === "hero") {
        return (
            <a
                className="external-articles-notice__button external-articles-notice__button--hero"
                href={url}
                target="_blank"
                rel="noopener noreferrer"
            >
                <BookOpen size={18} className="external-articles-notice__button-book" />
                <span>Read the summaries at {displayHost}</span>
                <ArrowRight size={18} className="external-articles-notice__button-arrow" />
            </a>
        );
    }

    return (
        <section className="external-articles-notice padding">
            <div className="boxed">
                <div className="external-articles-notice__card">
                    <div className="external-articles-notice__icon">
                        <BookOpen size={28} />
                    </div>
                    <h2 className="external-articles-notice__title">
                        Simplified Research Summaries
                    </h2>
                    <p className="external-articles-notice__text">
                        {tenant.name} writes and expert-verifies plain-language
                        summaries of the latest research, and the {partner}{" "}
                        publishes them for the community.
                    </p>
                    <a
                        className="external-articles-notice__button"
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <span>Read the summaries at {displayHost}</span>
                        <ArrowRight size={16} className="external-articles-notice__button-arrow" />
                    </a>
                </div>
            </div>
        </section>
    );
}
