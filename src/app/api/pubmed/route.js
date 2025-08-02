// app/api/pubmed/route.js
import { NextResponse } from "next/server";
import xml2js from "xml2js";

export const runtime = "nodejs";

export async function POST(req) {
    try {
        const { url } = await req.json();

        const validPattern = /(pubmed\.ncbi\.nlm\.nih\.gov\/\d+)|(pmc\.ncbi\.nlm\.nih\.gov\/articles\/PMC\d+)/i;
        if (!url || !validPattern.test(url)) {
            return NextResponse.json({ error: "Invalid PubMed or PubMed Central URL" }, { status: 400 });
        }

        // Detect DB & ID
        let db = "pubmed";
        let id = null;
        if (/pubmed\.ncbi\.nlm\.nih\.gov/i.test(url)) {
            id = url.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/i)?.[1];
        } else if (/pmc\.ncbi\.nlm\.nih\.gov/i.test(url)) {
            id = url.match(/PMC(\d+)/i)?.[1];
            db = "pmc";
        }
        if (!id) {
            return NextResponse.json({ error: "Could not extract ID" }, { status: 400 });
        }

        // Fetch from correct db
        const efetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=${db}&id=${id}&retmode=xml`;
        const response = await fetch(efetchUrl);
        if (!response.ok) {
            return NextResponse.json({ error: "Failed to fetch from NCBI" }, { status: 502 });
        }

        const xml = await response.text();
        const parsed = await xml2js.parseStringPromise(xml, { explicitArray: false });

        let title = "";
        let authors = [];
        let date = "";
        let doi = null;
        let abstract = "";

        if (db === "pubmed") {
            // PubMed XML
            const article = parsed?.PubmedArticleSet?.PubmedArticle?.MedlineCitation?.Article;
            if (!article) {
                return NextResponse.json({ error: "Article not found" }, { status: 404 });
            }

            title = article.ArticleTitle || "";

            // Abstract
            if (article.Abstract?.AbstractText) {
                const absData = Array.isArray(article.Abstract.AbstractText)
                    ? article.Abstract.AbstractText
                    : [article.Abstract.AbstractText];
                abstract = absData.map(obj => obj._ || obj).join("\n\n");
            }

            // Authors
            if (article.AuthorList?.Author) {
                const authorData = Array.isArray(article.AuthorList.Author)
                    ? article.AuthorList.Author
                    : [article.AuthorList.Author];
                authors = authorData.map(a => `${a.ForeName || ""} ${a.LastName || ""}`.trim());
            }

            // Date
            const pubDate = article.Journal?.JournalIssue?.PubDate || {};
            date = [pubDate.Year, pubDate.Month, pubDate.Day].filter(Boolean).join(" ");

            // DOI
            const ids = parsed?.PubmedArticleSet?.PubmedArticle?.PubmedData?.ArticleIdList?.ArticleId || [];
            doi = Array.isArray(ids)
                ? ids.find(i => i.$?.IdType === "doi")?._
                : ids._;

        } else if (db === "pmc") {
            // PMC XML
            const article = parsed?.["pmc-articleset"]?.article;
            if (!article) {
                return NextResponse.json({ error: "Article not found" }, { status: 404 });
            }

            const meta = article?.front?.["article-meta"];
            title = meta?.["title-group"]?.["article-title"] || "";

            // Authors
            const contribs = meta?.["contrib-group"]?.contrib;
            if (contribs) {
                const contribArray = Array.isArray(contribs) ? contribs : [contribs];
                authors = contribArray.map(c => {
                    const name = c?.name || {};
                    const parts = [
                        name.prefix || "",
                        name["given-names"] || "",
                        name.surname || "",
                        name.suffix || ""
                    ].filter(Boolean);
                    return parts.join(" ").replace(/\s+/g, " ").trim();
                });
            }


            // Date
            const pubDate = meta?.["pub-date"];
            if (pubDate) {
                date = [pubDate.Year || pubDate.year, pubDate.Month || pubDate.month, pubDate.Day || pubDate.day]
                    .filter(Boolean)
                    .join(" ");
            }

            // DOI
            const articleIds = meta?.["article-id"];
            if (articleIds) {
                const idsArray = Array.isArray(articleIds) ? articleIds : [articleIds];
                doi = idsArray.find(i => i.$?.["pub-id-type"] === "doi")?._;
            }

            // Abstract (PMC stores as sections in <abstract>)
            const abs = meta?.abstract;
            if (abs) {
                const absData = Array.isArray(abs) ? abs : [abs];
                abstract = absData
                    .map(a => (typeof a === "string" ? a : a?.["#text"] || ""))
                    .join("\n\n");
            }
        }

        return NextResponse.json({
            title,
            authors,
            publicationDate: date,
            doi,
            sourceLink: doi ? `https://doi.org/${doi}` : url,
            abstract
        });
    } catch (err) {
        console.error("PubMed fetch error:", err);
        return NextResponse.json({ error: "Failed to fetch PubMed data" }, { status: 500 });
    }
}// Authors (normalize to array)


