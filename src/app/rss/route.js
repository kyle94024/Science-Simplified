export const revalidate = 0;

import { query } from "@/lib/db";
import { tenant } from "@/lib/config";
import { hsfIdToArticleId } from "@/lib/hsfRedirects";

// Article IDs to exclude for HS tenant (already on external HS Foundation platform)
const hsExcludedIds = new Set(Object.values(hsfIdToArticleId).map(Number));

function escapeXml(str) {
    if (str == null) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

export async function GET() {
    try {
        const result = await query(`
            SELECT a.id, a.title, a.summary, a.innertext, a.authors,
                   a.publication_date, a.image_url, a.article_link
            FROM article a
            ORDER BY a.id DESC
        `);

        let articles = result.rows;

        // For HS tenant, exclude articles that are redirected to the external HS Foundation
        if (tenant.shortName === "HS") {
            articles = articles.filter((a) => !hsExcludedIds.has(a.id));
        }

        const domain = tenant.domain || "https://scisimplified.org";
        const feedTitle = escapeXml(tenant.fullName || tenant.name);
        const feedDescription = escapeXml(
            `Simplified ${tenant.diseaseLower || tenant.disease} research articles certified by experts.`
        );
        const buildDate = new Date().toUTCString();

        const items = articles
            .map((a) => {
                const link = `${domain}/articles/${a.id}`;
                const pubDate = a.publication_date;
                const dateStr = pubDate
                    ? new Date(pubDate).toUTCString()
                    : buildDate;

                return `    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <description>${escapeXml(a.summary)}</description>${
                    a.innertext
                        ? `\n      <content:encoded><![CDATA[${a.innertext}]]></content:encoded>`
                        : ""
                }${
                    a.authors
                        ? `\n      <author>${escapeXml(a.authors)}</author>`
                        : ""
                }${
                    a.image_url
                        ? `\n      <enclosure url="${escapeXml(a.image_url)}" type="image/jpeg" length="0"/>`
                        : ""
                }
      <pubDate>${dateStr}</pubDate>
    </item>`;
            })
            .join("\n");

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${feedTitle}</title>
    <link>${escapeXml(domain)}</link>
    <description>${feedDescription}</description>
    <language>en-us</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <atom:link href="${escapeXml(domain)}/rss" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

        return new Response(xml, {
            headers: {
                "Content-Type": "application/rss+xml; charset=utf-8",
                "Cache-Control": "s-maxage=3600, stale-while-revalidate",
            },
        });
    } catch (error) {
        console.error("Error generating RSS feed:", error);
        return new Response("Error generating RSS feed", { status: 500 });
    }
}
