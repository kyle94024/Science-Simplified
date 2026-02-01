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

// Month name mapping
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthMap = {
    "1": "Jan", "2": "Feb", "3": "Mar", "4": "Apr", "5": "May", "6": "Jun",
    "7": "Jul", "8": "Aug", "9": "Sep", "10": "Oct", "11": "Nov", "12": "Dec",
    "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr", "05": "May", "06": "Jun",
    "07": "Jul", "08": "Aug", "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec",
    "january": "Jan", "february": "Feb", "march": "Mar", "april": "Apr",
    "may": "May", "june": "Jun", "july": "Jul", "august": "Aug",
    "september": "Sep", "october": "Oct", "november": "Nov", "december": "Dec",
    "jan": "Jan", "feb": "Feb", "mar": "Mar", "apr": "Apr", "jun": "Jun",
    "jul": "Jul", "aug": "Aug", "sep": "Sep", "oct": "Oct", "nov": "Nov", "dec": "Dec"
};

// Format date as "YYYY Mon DD" (e.g., "2025 Oct 22")
const formatDate = (year, month, day) => {
    const y = getText(year);
    const m = getText(month);
    const d = getText(day);

    if (!y) return "";

    // Convert month to 3-letter abbreviation
    let monthStr = "";
    if (m) {
        const mLower = m.toLowerCase();
        monthStr = monthMap[mLower] || m.slice(0, 3);
        // Capitalize first letter
        monthStr = monthStr.charAt(0).toUpperCase() + monthStr.slice(1).toLowerCase();
    }

    // Build date string: "YYYY Mon DD" or "YYYY Mon" or just "YYYY"
    const parts = [y];
    if (monthStr) parts.push(monthStr);
    if (d) parts.push(d);

    return parts.join(" ");
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
            date = formatDate(pubDate.Year, pubDate.Month, pubDate.Day);

            // If no date from JournalIssue, try ArticleDate
            if (!date && article.ArticleDate) {
                const artDate = Array.isArray(article.ArticleDate) ? article.ArticleDate[0] : article.ArticleDate;
                date = formatDate(artDate?.Year, artDate?.Month, artDate?.Day);
            }

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

            // Authors - contrib-group can be an array (authors, editors, etc.)
            const contribGroups = meta?.["contrib-group"];
            if (contribGroups) {
                const groups = Array.isArray(contribGroups) ? contribGroups : [contribGroups];

                // Collect all contributors from all groups
                let allContribs = [];
                for (const group of groups) {
                    if (group?.contrib) {
                        const contribs = Array.isArray(group.contrib) ? group.contrib : [group.contrib];
                        allContribs.push(...contribs);
                    }
                }

                // Filter for authors only (contrib-type="author") and extract names
                authors = allContribs
                    .filter(c => !c.$?.["contrib-type"] || c.$?.["contrib-type"] === "author")
                    .map(c => {
                        const name = c?.name || {};
                        // Handle case where name might be a string-ref or collab
                        if (c?.collab) {
                            return getText(c.collab);
                        }
                        const parts = [
                            getText(name.prefix),
                            getText(name["given-names"]),
                            getText(name.surname),
                            getText(name.suffix)
                        ].filter(Boolean);
                        return parts.join(" ").replace(/\s+/g, " ").trim();
                    })
                    .filter(Boolean);
            }

            // Date - pub-date can be an array with multiple date types (epub, ppub, etc.)
            const pubDateData = meta?.["pub-date"];
            if (pubDateData) {
                // Handle array of dates - prefer ppub (print), then epub (electronic), then first available
                const pubDates = Array.isArray(pubDateData) ? pubDateData : [pubDateData];
                const preferredDate = pubDates.find(d => d.$?.["pub-type"] === "ppub")
                    || pubDates.find(d => d.$?.["pub-type"] === "epub")
                    || pubDates[0];

                if (preferredDate) {
                    date = formatDate(
                        preferredDate.year || preferredDate.Year,
                        preferredDate.month || preferredDate.Month,
                        preferredDate.day || preferredDate.Day
                    );
                }
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
