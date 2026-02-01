// Run this with: node test-pubmed.js
// Tests the PubMed/PMC XML parsing for authors

const xml2js = require('xml2js');

const getText = (val) => {
    if (!val) return "";
    if (typeof val === "string") return val;
    if (typeof val === "object" && val._) return val._;
    return "";
};

async function testPMC(pmcId) {
    const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pmc&id=${pmcId}&retmode=xml`;
    console.log(`Fetching: ${url}\n`);

    const response = await fetch(url);
    const xml = await response.text();
    const parsed = await xml2js.parseStringPromise(xml, { explicitArray: false });

    const article = parsed?.["pmc-articleset"]?.article;
    const meta = article?.front?.["article-meta"];

    // Debug: print contrib-group structure
    console.log("=== contrib-group structure ===");
    console.log(JSON.stringify(meta?.["contrib-group"], null, 2));

    console.log("\n=== Extracting authors ===");

    // Current extraction logic
    const contribs = meta?.["contrib-group"]?.contrib;
    let authors = [];

    if (contribs) {
        const contribArray = Array.isArray(contribs) ? contribs : [contribs];
        console.log(`Found ${contribArray.length} contrib entries`);

        authors = contribArray.map((c, i) => {
            console.log(`\nContrib ${i}:`, JSON.stringify(c, null, 2));
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

    console.log("\n=== Extracted authors ===");
    console.log(authors);
}

testPMC("5521906").catch(console.error);
