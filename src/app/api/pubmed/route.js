// app/api/pubmed/route.js
import { NextResponse } from "next/server";
import xml2js from "xml2js";

export const runtime = "nodejs"; // ensure full Node.js runtime (not edge)

export async function POST(req) {
    try {
        const { url } = await req.json();

        // Accept PubMed and PubMed Central links
        const validPattern = /(pubmed\.ncbi\.nlm\.nih\.gov\/\d+)|(pmc\.ncbi\.nlm\.nih\.gov\/articles\/PMC\d+)/i;
        if (!url || !validPattern.test(url)) {
            return NextResponse.json(
                { error: "Invalid PubMed or PubMed Central URL" },
                { status: 400 }
            );
        }

        // Extract numeric ID
        const idMatch = url.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)|PMC(\d+)/i);
        if (!idMatch) {
            return NextResponse.json({ error: "Could not extract ID" }, { status: 400 });
        }
        const id = idMatch[1] || idMatch[2];

        // Fetch from E-utilities
        const efetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${id}&retmode=xml`;
        const response = await fetch(efetchUrl);
        if (!response.ok) {
            return NextResponse.json({ error: "Failed to fetch from PubMed" }, { status: 502 });
        }
        const xml = await response.text();
        const parsed = await xml2js.parseStringPromise(xml, { explicitArray: false });

        const article = parsed?.PubmedArticleSet?.PubmedArticle?.MedlineCitation?.Article;
        if (!article) {
            return NextResponse.json({ error: "Article not found" }, { status: 404 });
        }

        // Title
        const title = article.ArticleTitle || "";

        // Abstract (normalize to array)
        let abstract = "";
        if (article.Abstract?.AbstractText) {
            const absData = Array.isArray(article.Abstract.AbstractText)
                ? article.Abstract.AbstractText
                : [article.Abstract.AbstractText];
            abstract = absData.map(obj => obj._ || obj).join("\n\n");
        }

        // Authors (normalize to array)
        let authors = [];
        if (article.AuthorList?.Author) {
            const authorData = Array.isArray(article.AuthorList.Author)
                ? article.AuthorList.Author
                : [article.AuthorList.Author];
            authors = authorData.map(a => {
                const first = a.ForeName || "";
                const last = a.LastName || "";
                return `${first} ${last}`.trim();
            });
        }

        // Date
        const pubDate = article.Journal?.JournalIssue?.PubDate || {};
        const date = [pubDate.Year, pubDate.Month, pubDate.Day].filter(Boolean).join(" ");

        // DOI
        const ids = parsed?.PubmedArticleSet?.PubmedArticle?.PubmedData?.ArticleIdList?.ArticleId || [];
        const doi = Array.isArray(ids)
            ? ids.find(i => i.$?.IdType === "doi")?._
            : ids._;

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
        retur
