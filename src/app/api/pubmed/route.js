// app/api/pubmed/route.js
import { NextResponse } from "next/server";
import xml2js from "xml2js";

export const runtime = "nodejs";

// Helper to safely extract text from xml2js values
const getText = (val) => {
    if (!val) return "";
    if (typeof val === "string") return val;
    if (typeof val === "number") return String(val);
    if (Array.isArray(val)) return val.map(getText).join("");
    if (typeof val === "object") {
        // Handle object with _ (text content with attributes)
        if (val._) return val._;
        // Handle #text property
        if (val["#text"]) return val["#text"];
        // Recursively extract text from all child properties (except $ which is attributes)
        return Object.entries(val)
            .filter(([key]) => key !== "$")
            .map(([, v]) => getText(v))
            .join("");
    }
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

// Extract plain text from a paragraph node (handles nested inline elements)
const extractParagraphText = (node) => {
    if (!node) return "";
    if (typeof node === "string") return node;
    if (typeof node === "number") return String(node);
    if (Array.isArray(node)) return node.map(extractParagraphText).join("");
    if (typeof node === "object") {
        // Get text content (with attributes)
        if (node._) return node._;
        // Skip xref (citations like [1], [2]) to keep text cleaner
        if (node.$ && node.$["ref-type"]) return "";
        // Recursively extract from children
        const parts = [];
        for (const [key, val] of Object.entries(node)) {
            if (key === "$") continue; // skip attributes
            parts.push(extractParagraphText(val));
        }
        return parts.join("");
    }
    return "";
};

// Extract figure label and caption
const extractFigureCaption = (figNode) => {
    if (!figNode) return null;
    const label = extractParagraphText(figNode.label).trim();
    const caption = figNode.caption;

    let captionText = "";
    if (caption) {
        const titleText = caption.title ? extractParagraphText(caption.title).trim() : "";
        const pText = caption.p ? extractParagraphText(caption.p).trim() : "";
        captionText = [titleText, pText].filter(Boolean).join(": ");
    }

    if (!label && !captionText) return null;
    return label ? `**${label}:** ${captionText}` : `**[Figure]:** ${captionText}`;
};

// Extract table label and caption (skip actual table data)
const extractTableCaption = (tableWrapNode) => {
    if (!tableWrapNode) return null;
    const label = extractParagraphText(tableWrapNode.label).trim();
    const caption = tableWrapNode.caption;

    let captionText = "";
    if (caption) {
        const titleText = caption.title ? extractParagraphText(caption.title).trim() : "";
        const pText = caption.p ? extractParagraphText(caption.p).trim() : "";
        captionText = [titleText, pText].filter(Boolean).join(": ");
    }

    if (!label && !captionText) return null;
    return label ? `**${label}:** ${captionText}` : `**[Table]:** ${captionText}`;
};

// Extract boxed text (key points, summaries)
const extractBoxedText = (boxedNode) => {
    if (!boxedNode) return null;
    const parts = [];

    if (boxedNode.title) {
        const titleText = extractParagraphText(boxedNode.title).trim();
        if (titleText) parts.push(`**${titleText}**`);
    }

    if (boxedNode.p) {
        const ps = Array.isArray(boxedNode.p) ? boxedNode.p : [boxedNode.p];
        ps.forEach(p => {
            const text = extractParagraphText(p).trim();
            if (text) parts.push(text);
        });
    }

    if (boxedNode.list) {
        const lists = Array.isArray(boxedNode.list) ? boxedNode.list : [boxedNode.list];
        lists.forEach(list => {
            if (list["list-item"]) {
                const items = Array.isArray(list["list-item"]) ? list["list-item"] : [list["list-item"]];
                items.forEach(item => {
                    const text = extractParagraphText(item).trim();
                    if (text) parts.push(`  * ${text}`);
                });
            }
        });
    }

    if (parts.length === 0) return null;
    return `---\n${parts.join("\n")}\n---`;
};

// Extract definition list (term/definition pairs)
const extractDefinitionList = (defListNode) => {
    if (!defListNode) return [];
    const items = [];

    const defItems = defListNode["def-item"];
    if (!defItems) return [];

    const itemsArray = Array.isArray(defItems) ? defItems : [defItems];
    itemsArray.forEach(item => {
        const term = extractParagraphText(item.term).trim();
        const def = extractParagraphText(item.def).trim();
        if (term || def) {
            items.push(`**${term || "Term"}:** ${def}`);
        }
    });

    return items;
};

// Extract block quotes
const extractBlockQuote = (quoteNode) => {
    if (!quoteNode) return null;
    const text = extractParagraphText(quoteNode).trim();
    if (!text) return null;
    return text.split('\n').map(line => `> ${line}`).join('\n');
};

// Extract statements (theorems, principles, etc.)
const extractStatement = (statementNode) => {
    if (!statementNode) return null;
    const parts = [];

    const label = extractParagraphText(statementNode.label).trim();
    if (label) parts.push(`**${label}:**`);

    if (statementNode.title) {
        const titleText = extractParagraphText(statementNode.title).trim();
        if (titleText) parts.push(`**${titleText}**`);
    }

    if (statementNode.p) {
        const ps = Array.isArray(statementNode.p) ? statementNode.p : [statementNode.p];
        ps.forEach(p => {
            const text = extractParagraphText(p).trim();
            if (text) parts.push(text);
        });
    }

    return parts.length > 0 ? parts.join(" ") : null;
};

// Recursive function to collect text with headings from PMC body
const collectTextWithHeadings = (node, paragraphs = []) => {
    if (!node) return paragraphs;

    if (typeof node === "string") {
        const trimmed = node.trim();
        if (trimmed) paragraphs.push(trimmed);
        return paragraphs;
    }

    if (Array.isArray(node)) {
        node.forEach(n => collectTextWithHeadings(n, paragraphs));
        return paragraphs;
    }

    if (typeof node === "object") {
        // Section title
        if (node.title) {
            const titleText = extractParagraphText(node.title).trim();
            if (titleText) paragraphs.push(`\n\n## ${titleText}\n`);
        }

        // Label (for named sections without title)
        if (node.label && !node.title && !node.fig && !node["table-wrap"]) {
            const labelText = extractParagraphText(node.label).trim();
            if (labelText) {
                paragraphs.push(`\n\n## ${labelText}\n`);
            }
        }

        // Paragraphs - extract all text content
        if (node.p) {
            const ps = Array.isArray(node.p) ? node.p : [node.p];
            ps.forEach(p => {
                const text = extractParagraphText(p).trim();
                if (text) paragraphs.push(text);
            });
        }

        // Handle list items
        if (node.list) {
            const lists = Array.isArray(node.list) ? node.list : [node.list];
            lists.forEach(list => {
                if (list["list-item"]) {
                    const items = Array.isArray(list["list-item"]) ? list["list-item"] : [list["list-item"]];
                    items.forEach(item => {
                        const text = extractParagraphText(item).trim();
                        if (text) paragraphs.push(`• ${text}`);
                    });
                }
            });
        }

        // Definition lists
        if (node["def-list"]) {
            const defLists = Array.isArray(node["def-list"]) ? node["def-list"] : [node["def-list"]];
            defLists.forEach(defList => {
                const items = extractDefinitionList(defList);
                paragraphs.push(...items);
            });
        }

        // Figures (caption only)
        if (node.fig) {
            const figs = Array.isArray(node.fig) ? node.fig : [node.fig];
            figs.forEach(fig => {
                const caption = extractFigureCaption(fig);
                if (caption) paragraphs.push(caption);
            });
        }

        // Tables (caption only - skip table data)
        if (node["table-wrap"]) {
            const tables = Array.isArray(node["table-wrap"]) ? node["table-wrap"] : [node["table-wrap"]];
            tables.forEach(table => {
                const caption = extractTableCaption(table);
                if (caption) paragraphs.push(caption);
            });
        }

        // Boxed text (key points, summaries)
        if (node["boxed-text"]) {
            const boxes = Array.isArray(node["boxed-text"]) ? node["boxed-text"] : [node["boxed-text"]];
            boxes.forEach(box => {
                const content = extractBoxedText(box);
                if (content) paragraphs.push(content);
            });
        }

        // Block quotes
        if (node["disp-quote"]) {
            const quotes = Array.isArray(node["disp-quote"]) ? node["disp-quote"] : [node["disp-quote"]];
            quotes.forEach(quote => {
                const content = extractBlockQuote(quote);
                if (content) paragraphs.push(content);
            });
        }

        // Statements (theorems, principles)
        if (node.statement) {
            const statements = Array.isArray(node.statement) ? node.statement : [node.statement];
            statements.forEach(stmt => {
                const content = extractStatement(stmt);
                if (content) paragraphs.push(content);
            });
        }

        // Display formulas (equations)
        if (node["disp-formula"]) {
            const formulas = Array.isArray(node["disp-formula"]) ? node["disp-formula"] : [node["disp-formula"]];
            formulas.forEach(formula => {
                const text = extractParagraphText(formula).trim();
                if (text) paragraphs.push(`[Equation: ${text}]`);
            });
        }

        // Supplementary material references
        if (node["supplementary-material"]) {
            const supps = Array.isArray(node["supplementary-material"]) ? node["supplementary-material"] : [node["supplementary-material"]];
            supps.forEach(supp => {
                const label = extractParagraphText(supp.label).trim();
                const caption = supp.caption ? extractParagraphText(supp.caption).trim() : "";
                if (label || caption) {
                    paragraphs.push(`[Supplementary Material: ${[label, caption].filter(Boolean).join(" - ")}]`);
                }
            });
        }

        // Verse groups (rare in scientific articles)
        if (node["verse-group"]) {
            const verses = Array.isArray(node["verse-group"]) ? node["verse-group"] : [node["verse-group"]];
            verses.forEach(verse => {
                const text = extractParagraphText(verse).trim();
                if (text) paragraphs.push(`> ${text}`);
            });
        }

        // Recurse into nested sections
        if (node.sec) {
            const secs = Array.isArray(node.sec) ? node.sec : [node.sec];
            secs.forEach(sec => collectTextWithHeadings(sec, paragraphs));
        }

        // Handle body element
        if (node.body) {
            collectTextWithHeadings(node.body, paragraphs);
        }
    }

    return paragraphs;
};

// Extract back matter content (acknowledgments, appendices, glossary)
const extractBackMatter = (backNode, paragraphs = []) => {
    if (!backNode) return paragraphs;

    // Acknowledgments
    if (backNode.ack) {
        const acks = Array.isArray(backNode.ack) ? backNode.ack : [backNode.ack];
        acks.forEach(ack => {
            paragraphs.push(`\n\n## Acknowledgments\n`);
            if (ack.title) {
                const titleText = extractParagraphText(ack.title).trim();
                if (titleText && titleText.toLowerCase() !== "acknowledgments" && titleText.toLowerCase() !== "acknowledgements") {
                    paragraphs.push(`**${titleText}**`);
                }
            }
            if (ack.p) {
                const ps = Array.isArray(ack.p) ? ack.p : [ack.p];
                ps.forEach(p => {
                    const text = extractParagraphText(p).trim();
                    if (text) paragraphs.push(text);
                });
            }
            if (ack.sec) {
                collectTextWithHeadings(ack.sec, paragraphs);
            }
        });
    }

    // Appendices
    const appGroup = backNode["app-group"];
    const apps = appGroup?.app || backNode.app;
    if (apps) {
        const appArray = Array.isArray(apps) ? apps : [apps];
        appArray.forEach(app => {
            const label = extractParagraphText(app.label).trim();
            const title = app.title ? extractParagraphText(app.title).trim() : "";
            const heading = [label, title].filter(Boolean).join(": ") || "Appendix";
            paragraphs.push(`\n\n## ${heading}\n`);
            collectTextWithHeadings(app, paragraphs);
        });
    }

    // Glossary
    if (backNode.glossary) {
        const glossaries = Array.isArray(backNode.glossary) ? backNode.glossary : [backNode.glossary];
        glossaries.forEach(glossary => {
            paragraphs.push(`\n\n## Glossary\n`);
            if (glossary["def-list"]) {
                const items = extractDefinitionList(glossary["def-list"]);
                paragraphs.push(...items);
            }
        });
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
                        // Include back matter (acknowledgments, appendices)
                        if (pmcArticle?.back) {
                            extractBackMatter(pmcArticle.back, bodyParagraphs);
                        }
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
                const abstractParts = [];
                absData.forEach(a => {
                    // Abstract might have nested sec/p structure or direct text
                    if (a?.sec) {
                        collectTextWithHeadings(a.sec, abstractParts);
                    } else if (a?.p) {
                        const ps = Array.isArray(a.p) ? a.p : [a.p];
                        ps.forEach(p => {
                            const text = extractParagraphText(p).trim();
                            if (text) abstractParts.push(text);
                        });
                    } else {
                        const text = extractParagraphText(a).trim();
                        if (text) abstractParts.push(text);
                    }
                });
                abstract = abstractParts.join("\n\n");
            }

            // Full content (abstract + body with headings)
            const body = article?.body;
            if (body) {
                const bodyParagraphs = collectTextWithHeadings(body, []);
                // Include back matter (acknowledgments, appendices)
                if (article?.back) {
                    extractBackMatter(article.back, bodyParagraphs);
                }
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
