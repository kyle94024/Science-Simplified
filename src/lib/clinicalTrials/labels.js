/**
 * Display labels for trial cards and the trial page, in the reader's language
 * (pass `t` from useUiText). English text is marked with uiText() so
 * `npm run ui-text:check` keeps the translations complete.
 */
import { uiText } from "@/lib/uiText";
import { formatTrialAge } from "@/lib/clinicalTrials/ageLabels";

// ClinicalTrials.gov study types (the API sends them lowercased, e.g.
// "observational") — the same labels the type filter uses — with a
// plain-language explanation.
const STUDY_TYPES = {
    interventional: { label: uiText("Interventional"), hint: uiText("Participants receive a treatment or approach that is being tested.") },
    observational: { label: uiText("Observational"), hint: uiText("Researchers observe participants; no study treatment is given.") },
    expanded_access: { label: uiText("Expanded Access"), hint: uiText("Access to a treatment that isn't approved yet, outside a clinical trial.") },
};

/** { label, hint } for a study type, or null. Unknown types keep their own name. */
export function studyType(type) {
    if (!type) return null;
    const key = String(type).toLowerCase();
    return STUDY_TYPES[key] || { label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " "), hint: null };
}

// Statuses the public pages can show.
const STATUSES = {
    RECRUITING: { label: uiText("Recruiting"), hint: null, tone: "open" },
    ENROLLING_BY_INVITATION: { label: uiText("By invitation"), hint: uiText("Enrolling by invitation only"), tone: "invite" },
    NOT_YET_RECRUITING: { label: uiText("Not yet recruiting"), hint: null, tone: "soon" },
    ACTIVE_NOT_RECRUITING: { label: uiText("Active, not recruiting"), hint: null, tone: "closed" },
    COMPLETED: { label: uiText("Completed"), hint: null, tone: "closed" },
};

/** { label, hint, tone } for a ClinicalTrials.gov overall status, or null. */
export function trialStatus(status) {
    return STATUSES[status] || null;
}

/** "Phase 2", "Phase 1/2", "Early phase 1", or null — from designModule.phases. */
export function trialPhase(phases, t) {
    const list = (Array.isArray(phases) ? phases : phases ? [phases] : []).map((p) => String(p).toUpperCase());
    if (list.includes("EARLY_PHASE1")) return t("Early phase 1");
    const numbers = list.map((p) => /^PHASE(\d)$/.exec(p)?.[1]).filter(Boolean);
    return numbers.length ? t("Phase {phase}", { phase: numbers.join("/") }) : null;
}

/** "18 Years+", "Up to 17 Years", "8 Years–75 Years" (in the reader's language), or null. */
export function formatAgeRange(min, max, t) {
    if (!min && !max) return null;
    const [from, to] = [formatTrialAge(min, t), formatTrialAge(max, t)];
    if (min && !max) return `${from}+`;
    if (!min && max) return t("Up to {max}", { max: to });
    return `${from}–${to}`;
}
