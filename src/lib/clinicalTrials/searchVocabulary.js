/**
 * Shared search vocabulary for clinical trials — used by the public page
 * (keyword matching in the browser) and by the semantic-search route (query
 * expansion before embedding). Pure JS: no DOM, no database.
 *
 * Why this exists: trial titles and summaries on the site are AI-rewritten for
 * patients, so the clinical vocabulary people actually type — acronyms
 * (STARFISH, INTUITT-NF2), current disease names (NF2-SWN, "NF2-related
 * schwannomatosis") — is often not in the rewritten text at all. A keyword
 * search therefore has to look at the official title, acronym, conditions and
 * keywords too, and treat known synonyms as the same thing.
 */

/**
 * Per-tenant synonym groups, keyed by TENANT_CONFIG key (upper-case). Every
 * term in a group is treated as equivalent to every other term in it. Keep
 * terms unambiguous: a short token like "pn" would match far too much.
 */
const SYNONYM_GROUPS = {
    NF: [
        // NF2 was renamed "NF2-related schwannomatosis" (NF2-SWN) in 2022, and
        // registered trials use every spelling that ever existed.
        [
            "nf2-swn", "nf2 swn", "nf2swn", "swn-nf2",
            "nf2-related schwannomatosis", "nf2 related schwannomatosis",
            "neurofibromatosis type 2", "neurofibromatosis 2", "neurofibromatosis type ii",
            "nf2", "nf-2",
            "vestibular schwannoma", "vestibular schwannomas", "acoustic neuroma", "acoustic schwannoma",
            "bilateral vestibular schwannoma",
        ],
        [
            "schwannomatosis", "swn", "schwannomatoses",
            "nf2-related schwannomatosis", "smarcb1-related schwannomatosis", "lztr1-related schwannomatosis",
            "schwannoma", "schwannomas",
        ],
        [
            "nf1", "nf-1", "neurofibromatosis type 1", "neurofibromatosis 1", "neurofibromatosis type i",
            "von recklinghausen", "von recklinghausen disease",
        ],
        ["mpnst", "malignant peripheral nerve sheath tumor", "malignant peripheral nerve sheath tumour"],
        ["plexiform neurofibroma", "plexiform neurofibromas", "plexiform"],
        ["cutaneous neurofibroma", "cutaneous neurofibromas", "dermal neurofibroma", "cnf"],
        ["optic pathway glioma", "optic glioma", "opg"],
        ["cafe au lait", "cafe-au-lait", "café au lait"],
    ],
    HS: [["hidradenitis suppurativa", "hidradenitis", "acne inversa", "hs"]],
    ALS: [
        [
            "amyotrophic lateral sclerosis", "als", "lou gehrig's disease", "lou gehrigs disease",
            "motor neuron disease", "motor neurone disease", "mnd",
        ],
    ],
    EB: [["epidermolysis bullosa", "eb", "butterfly skin"]],
    CF: [["cystic fibrosis", "cf"]],
    HUNTINGTONS: [["huntington's disease", "huntingtons disease", "huntington disease", "huntingtons", "huntington's"]],
    RETTS: [["rett syndrome", "rett", "mecp2"]],
    SCLERODERMA: [["scleroderma", "systemic sclerosis", "ssc"]],
    MYOSITIS: [["myositis", "dermatomyositis", "polymyositis", "inclusion body myositis", "ibm"]],
};

/** Words that carry no signal on a trials page. */
const STOPWORDS = new Set([
    "a", "an", "the", "and", "or", "of", "for", "in", "on", "at", "to", "with", "about", "any",
    "is", "are", "am", "be", "my", "i", "me", "we", "our", "you", "your", "there", "this", "that",
    "trial", "trials", "study", "studies", "clinical", "research", "patient", "patients",
    "looking", "want", "need", "find",
]);

/** Lower-case, strip accents, collapse everything that isn't a letter/digit. */
export function normalize(text) {
    return String(text ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

// Normalized groups, longest terms first so "nf2 related schwannomatosis" is
// claimed before "nf2" when both appear in a query.
const NORMALIZED_GROUPS = Object.fromEntries(
    Object.entries(SYNONYM_GROUPS).map(([key, groups]) => [
        key,
        groups.map((terms) => {
            const normalized = [...new Set(terms.map(normalize).filter(Boolean))];
            return normalized.sort((a, b) => b.length - a.length);
        }),
    ])
);

export function synonymGroupsFor(tenantKey) {
    return NORMALIZED_GROUPS[String(tenantKey || "").toUpperCase()] || [];
}

/**
 * Everything a keyword search should look at, as one normalized string.
 * Accepts rows from /api/clinical-trials/active|completed|search (flat fields)
 * and raw sync rows (raw_data).
 */
export function trialSearchText(trial) {
    if (!trial) return "";
    const id = trial.raw_data?.protocolSection?.identificationModule || {};
    const cm = trial.raw_data?.protocolSection?.conditionsModule || {};
    const list = (v) => (Array.isArray(v) ? v.join(" ") : v || "");
    return normalize(
        [
            trial.short_title_manual || trial.short_title,
            trial.brief_title || id.briefTitle,
            trial.official_title || id.officialTitle,
            trial.acronym || id.acronym,
            list(trial.conditions ?? cm.conditions),
            list(trial.keywords ?? cm.keywords),
            trial.ai_summary_manual || trial.ai_summary,
            trial.nct_id,
        ]
            .filter(Boolean)
            .join(" ")
    );
}

/** A term matches when it starts at a word boundary in the haystack: "nf2"
 *  matches "nf2 related", "schwannoma" matches "schwannomas", but "als" does
 *  not match inside "trials". */
function hasTerm(haystack, term) {
    return (" " + haystack).includes(" " + term);
}

/**
 * Break a query into requirements: each is a list of alternatives, at least
 * one of which must appear in the haystack. Synonym phrases found in the query
 * become their whole group; the remaining tokens stand alone (minus stopwords).
 */
export function queryRequirements(query, tenantKey) {
    const q = normalize(query);
    if (!q) return [];
    let rest = " " + q + " ";
    const requirements = [];
    for (const group of synonymGroupsFor(tenantKey)) {
        for (const term of group) {
            const needle = " " + term + " ";
            if (rest.includes(needle)) {
                requirements.push(group);
                rest = rest.split(needle).join(" ");
            }
        }
    }
    for (const token of rest.trim().split(/\s+/)) {
        if (!token || token.length < 2 || STOPWORDS.has(token)) continue;
        requirements.push([token]);
    }
    return requirements;
}

/** Does this trial match a free-text query (keyword search)? */
export function matchesQuery(trial, query, tenantKey) {
    const q = normalize(query);
    if (!q) return true;
    const haystack = trialSearchText(trial);
    if (hasTerm(haystack, q)) return true; // the literal phrase
    const requirements = queryRequirements(q, tenantKey);
    if (requirements.length === 0) return false; // only stopwords
    return requirements.every((alternatives) => alternatives.some((t) => hasTerm(haystack, t)));
}

/**
 * For the semantic route: append the synonyms of any recognised term, so
 * "NF2-SWN treatment options" embeds as something the model actually knows.
 */
export function expandQueryForEmbedding(query, tenantKey) {
    const q = normalize(query);
    if (!q) return String(query ?? "");
    const padded = " " + q + " ";
    const extras = new Set();
    for (const group of synonymGroupsFor(tenantKey)) {
        if (group.some((term) => padded.includes(" " + term + " "))) {
            for (const term of group) if (!padded.includes(" " + term + " ")) extras.add(term);
        }
    }
    if (extras.size === 0) return String(query);
    return `${String(query).trim()} (${[...extras].slice(0, 8).join(", ")})`;
}
