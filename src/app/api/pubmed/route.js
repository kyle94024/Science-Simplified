// app/api/pubmed/route.js
import { NextResponse } from "next/server";
import xml2js from "xml2js";

export const runtime = "nodejs";

// Helper to safely extract text from xml2js values
const getText = (val) => {
    if (!val) return "";
    if (typeof val === "string") return val;
    if (typeof val === "object" && val._) return val._;
    return "";
};

// Recursive function to collect text with headings
const collectTextWithHeadings = (node, paragraphs = []) => {
    if (!node) return paragraphs;

    if (typeof node === "string") {
        if (node.trim()) paragraphs.push(node.trim());
    } else if (Array.isArray(node)) {
        node.forEach(n => collectTextWithHeadings(n, paragraphs));
    } else if (typeof node === "object") {
        // Section title
        if (node.title) {
            paragraphs.push(`\n\n## ${getText(node.title)}\n`);
        }
        // Paragraphs
        if (node.p) {
            const ps = Array.isArray(node.p) ? node.p : [node.p];
            ps.forEach(p => {
                const text = typeof p === "string" ? p : getText(p) || getText(p?.["#text"]);
                if (text.trim()) paragraphs.push(text.trim());
            });
        }
        // Recurse into nested sections
        if (node.sec) collectTextWithHeadings(node.sec, paragraphs);
    }

    return paragraphs;
};

export async function POST(req) {
    try {
        const { url } = await req.json();

        const validPattern =
            /(pubmed\.ncbi\.nlm\.nih\.gov\/\d+)|(pmc\.ncbi\.nlm\.nih\.gov\/articles\/PMC\d+)/i;
        if (!url || !validPattern.test(url)) {
            return NextResponse.json(
                { error: "Invalid PubMed or PubMed Central URL" },
                { status: 400 }
            );
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
        let content = "";
        let journalName = "";

        if (db === "pubmed") {
            // PubMed XML
            const article = parsed?.PubmedArticleSet?.PubmedArticle?.MedlineCitation?.Article;
            if (!article) {
                return NextResponse.json({ error: "Article not found" }, { status: 404 });
            }

            title = getText(article.ArticleTitle);

            // Abstract
            if (article.Abstract?.AbstractText) {
                const absData = Array.isArray(article.Abstract.AbstractText)
                    ? article.Abstract.AbstractText
                    : [article.Abstract.AbstractText];
                abstract = absData.map(obj => getText(obj)).join("\n\n");
            }

            // Authors
            if (article.AuthorList?.Author) {
                const authorData = Array.isArray(article.AuthorList.Author)
                    ? article.AuthorList.Author
                    : [article.AuthorList.Author];
                authors = authorData.map(a => {
                    const parts = [getText(a.ForeName), getText(a.LastName)].filter(Boolean);
                    return parts.join(" ").replace(/\s+/g, " ").trim();
                });
            }

            // Date
            const pubDate = article.Journal?.JournalIssue?.PubDate || {};
            date = [pubDate.Year, pubDate.Month, pubDate.Day].filter(Boolean).join(" ");

            // Journal name
            journalName = getText(article.Journal?.Title) || getText(article.Journal?.ISOAbbreviation) || "";

            // DOI + check for PMC ID
            const ids =
                parsed?.PubmedArticleSet?.PubmedArticle?.PubmedData?.ArticleIdList?.ArticleId || [];
            doi = Array.isArray(ids)
                ? ids.find(i => i.$?.IdType === "doi")?._
                : ids._;
            const pmcId = Array.isArray(ids)
                ? ids.find(i => i.$?.IdType === "pmc")?._
                : null;

            content = abstract;

            // If PubMed has a linked PMC ID, fetch full text
            if (pmcId) {
                const pmcResponse = await fetch(
                    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pmc&id=${pmcId}&retmode=xml`
                );
                if (pmcResponse.ok) {
                    const pmcXml = await pmcResponse.text();
                    const pmcParsed = await xml2js.parseStringPromise(pmcXml, { explicitArray: false });
                    const pmcArticle = pmcParsed?.["pmc-articleset"]?.article;
                    if (pmcArticle?.body) {
                        const bodyParagraphs = collectTextWithHeadings(pmcArticle.body, []);
                        content = [abstract, bodyParagraphs.join("\n\n")].filter(Boolean).join("\n\n");
                    }
                }
            }
        } else if (db === "pmc") {
            // PMC XML
            const article = parsed?.["pmc-articleset"]?.article;
            if (!article) {
                return NextResponse.json({ error: "Article not found" }, { status: 404 });
            }

            const meta = article?.front?.["article-meta"];
            title = getText(meta?.["title-group"]?.["article-title"]);

            // Authors
            const contribs = meta?.["contrib-group"]?.contrib;
            if (contribs) {
                const contribArray = Array.isArray(contribs) ? contribs : [contribs];
                authors = contribArray.map(c => {
                    const name = c?.name || {};
                    const parts = [
                        getText(name.prefix),
                        getText(name["given-names"]),
                        getText(name.surname),
                        getText(name.suffix)
                    ].filter(Boolean);
                    return parts.join(" ").replace(/\s+/g, " ").trim();
                });
            }

            // Date
            const pubDate = meta?.["pub-date"];
            if (pubDate) {
                date = [
                    getText(pubDate.Year || pubDate.year),
                    getText(pubDate.Month || pubDate.month),
                    getText(pubDate.Day || pubDate.day)
                ]
                    .filter(Boolean)
                    .join(" ");
            }

            // DOI
            const articleIds = meta?.["article-id"];
            if (articleIds) {
                const idsArray = Array.isArray(articleIds) ? articleIds : [articleIds];
                doi = idsArray.find(i => i.$?.["pub-id-type"] === "doi")?._;
            }

            // Journal name
            const journalMeta = article?.front?.["journal-meta"];
            journalName = getText(journalMeta?.["journal-title-group"]?.["journal-title"])
                || getText(journalMeta?.["journal-title"])
                || "";

            // Abstract
            const abs = meta?.abstract;
            if (abs) {
                const absData = Array.isArray(abs) ? abs : [abs];
                abstract = absData
                    .map(a => (typeof a === "string" ? a : getText(a?.["#text"] || a)))
                    .join("\n\n");
            }

            // Full content (abstract + body with headings)
            const body = article?.body;
            if (body) {
                const bodyParagraphs = collectTextWithHeadings(body, []);
                content = [abstract, bodyParagraphs.join("\n\n")].filter(Boolean).join("\n\n");
            } else {
                content = abstract;
            }
        }

        return NextResponse.json({
            title,
            authors,
            publicationDate: date,
            sourcePublication: journalName,
            doi,
            sourceLink: doi ? `https://doi.org/${doi}` : url,
            content
        });
    } catch (err) {
        console.error("PubMed fetch error:", err);
        return NextResponse.json({ error: "Failed to fetch PubMed data" }, { status: 500 });
    }
}
