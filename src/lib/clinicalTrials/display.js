/**
 * What a trial is called and who runs it — for trial cards and the trial page.
 * Pure JS. Accepts the flat rows from /api/clinical-trials/active|completed|
 * search and raw rows with `raw_data` (the trial page).
 */

// Condition and tumour abbreviations that registered titles often end with —
// "… Neurofibromatosis Type 1 (NF1)" — and that aren't the name of a study.
const NOT_A_STUDY_NAME = new Set([
    "nf", "nf1", "nf2", "nf-1", "nf-2", "nf3", "swn", "nf2-swn",
    "pn", "pns", "pnf", "pnfs", "cnf", "cnfs", "dnf", "pnst", "mpnst", "anf", "anni",
    "opg", "lgg", "hgg", "jmml", "gist", "cns",
    "als", "cf", "eb", "hd", "hs", "ssc", "ibm", "dm", "pm",
]);

/**
 * The study's official short name — "STARFISH", "INTUITT-NF2", "KOMET" — or
 * null. ClinicalTrials.gov has an acronym field, but many studies (STARFISH
 * among them) only give their name in parentheses at the end of the title.
 */
export function trialShortName(trial) {
    if (!trial) return null;
    const id = trial.raw_data?.protocolSection?.identificationModule || {};
    const acronym = String(trial.acronym ?? id.acronym ?? "").trim();
    if (acronym && !NOT_A_STUDY_NAME.has(acronym.toLowerCase())) return acronym;

    for (const title of [trial.official_title ?? id.officialTitle, trial.brief_title ?? id.briefTitle]) {
        const name = /\(([A-Za-z0-9][A-Za-z0-9-]{2,24})\)\s*\.?\s*$/.exec(title || "")?.[1];
        if (!name || NOT_A_STUDY_NAME.has(name.toLowerCase())) continue;
        // A name is mostly capitals ("STARFISH", "NF112"); "(Trametinib)" is a drug.
        const letters = name.replace(/[^A-Za-z]/g, "");
        const capitals = name.replace(/[^A-Z]/g, "").length;
        if (capitals >= 2 && capitals * 2 >= letters.length) return name;
    }
    return null;
}

// Officials listed with an organisation's name or a job title instead of a person.
const NOT_A_PERSON =
    /\b(inc|incorporated|corp|corporation|ltd|limited|llc|gmbh|plc|pharma|pharmaceuticals?|therapeutics|biosciences?|biotech|university|hospital|institute|center|centre|foundation|consortium|group|network|alliance|clinic|clinical trials?|medical director|study director|sponsor)\b/i;

const ROLE_ORDER = ["PRINCIPAL_INVESTIGATOR", "STUDY_CHAIR", "STUDY_DIRECTOR"];

const comparable = (text) =>
    String(text ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();

/** Same organisation, allowing for "Pasithea Therapeutics" vs "Pasithea Therapeutics Corp.". */
function sameOrganization(a, b) {
    const [x, y] = [comparable(a), comparable(b)];
    if (!x || !y) return false;
    const stem = (s) => s.split(" ").slice(0, 2).join(" ");
    return x.includes(stem(y)) || y.includes(stem(x));
}

/**
 * Who runs the study, for "Led by …":
 *   { person: "Scott Plotkin, MD", organization: "Massachusetts General Hospital" }
 *   { person: null, organization: "AstraZeneca" }
 * The named investigator and their institution when the registry lists one;
 * otherwise the lead sponsor. A company's own staff aren't shown — patients
 * know the company — but an academic chair of an industry trial is.
 * Returns null when the registry names nobody.
 */
export function trialLeadership(trial) {
    if (!trial) return null;
    const ps = trial.raw_data?.protocolSection || {};
    const lead = ps.sponsorCollaboratorsModule?.leadSponsor || {};
    const sponsor = String(trial.lead_sponsor ?? lead.name ?? "").trim();
    const sponsorClass = trial.lead_sponsor_class ?? lead.class ?? "";
    const officials = (Array.isArray(trial.officials) ? trial.officials : ps.contactsLocationsModule?.overallOfficials) || [];

    const people = officials.filter((o) => o?.name?.trim() && !NOT_A_PERSON.test(o.name));
    const official =
        ROLE_ORDER.map((role) => people.find((o) => o.role === role)).find(Boolean) || people[0] || null;
    const companyStaff = official && sponsorClass === "INDUSTRY" && sameOrganization(official.affiliation, sponsor);

    if (official && !companyStaff) {
        const organization = String(official.affiliation || "").trim() || (NOT_A_PERSON.test(sponsor) ? sponsor : "");
        return { person: official.name.trim(), organization: organization || null };
    }
    return sponsor ? { person: null, organization: sponsor } : null;
}

/** "Scott Plotkin, MD · Massachusetts General Hospital", "AstraZeneca", or null. */
export function formatLeadership(leadership) {
    if (!leadership) return null;
    return [leadership.person, leadership.organization].filter(Boolean).join(" · ") || null;
}
