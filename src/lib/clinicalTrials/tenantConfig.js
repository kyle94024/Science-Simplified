// Shared tenant config for clinical trials sync routes.
// Previously duplicated across /api/clinical-trials/sync/route.js and /api/clinical-trials/sync/[tenant]/route.js.
// Single source of truth for: search terms, tenant-specific matching rules, source hashing, date normalization.

import crypto from "crypto";

/**
 * Per-tenant clinical trials configuration.
 *
 * Fields:
 *   required: trial must include at least one of these terms in its conditions (or, for some tenants, broader text)
 *   exclude: trial must NOT include any of these terms in its conditions
 *   requireVerification: when true, only verified trials show on the public page (currently off everywhere)
 */
export const TENANT_CONFIG = {
  HS: {
    required: ["hidradenitis suppurativa", "hidradenitis"],
    exclude: ["mood", "parkinson", "glioblastoma"],
    requireVerification: false,
  },
  NF: {
    required: ["neurofibromatosis", "nf1", "nf2", "schwannomatosis"],
    exclude: [],
    requireVerification: false,
  },
  EB: {
    required: ["epidermolysis bullosa"],
    exclude: [],
    requireVerification: false,
  },
  CF: {
    required: ["cystic fibrosis"],
    exclude: [],
    requireVerification: false,
  },
  RUNX1: {
    required: ["runx1", "familial platelet disorder"],
    exclude: [],
    requireVerification: false,
  },
  TURNERS: {
    required: ["turner syndrome", "turners syndrome", "monosomy x"],
    exclude: [],
    requireVerification: false,
  },
  HUNTINGTONS: {
    required: ["huntington disease", "huntington's disease", "huntingtons"],
    exclude: [],
    requireVerification: false,
  },
  PROGERIA: {
    required: ["progeria", "hutchinson-gilford"],
    exclude: [],
    requireVerification: false,
  },
  AICARDI: {
    required: ["aicardi syndrome", "aicardi-goutieres"],
    exclude: [],
    requireVerification: false,
  },
  ASHERMANS: {
    required: ["asherman syndrome", "ashermans syndrome", "intrauterine adhesion", "intrauterine synechiae"],
    exclude: [],
    requireVerification: false,
  },
  CANAVANS: {
    required: ["canavan disease", "aspartoacylase deficiency"],
    exclude: [],
    requireVerification: false,
  },
  RETTS: {
    required: ["rett syndrome", "mecp2"],
    exclude: [],
    requireVerification: false,
  },
  RYR1: {
    required: ["ryr1", "ryanodine receptor", "malignant hyperthermia", "central core disease"],
    exclude: [],
    requireVerification: false,
  },
  ALS: {
    required: ["amyotrophic lateral sclerosis", "als", "motor neuron disease"],
    exclude: ["mood", "depression", "caregiver burden"],
    requireVerification: false,
  },
  VITILIGO: {
    required: ["vitiligo"],
    exclude: [],
    requireVerification: false,
  },
  SCLERODERMA: {
    required: ["scleroderma", "systemic sclerosis", "morphea"],
    exclude: [],
    requireVerification: false,
  },
  MYOSITIS: {
    required: ["myositis", "dermatomyositis", "polymyositis", "inclusion body myositis"],
    exclude: [],
    requireVerification: false,
  },
};

/**
 * Does this trial match the given tenant's filtering rules?
 * RUNX1 has a special case: it searches conditions + keywords + title + descriptions
 * because many leukemia trials reference RUNX1 in description but not conditions.
 */
export function trialMatchesTenant(trial, tenantKey) {
  const config = TENANT_CONFIG[tenantKey];
  if (!config) return false;

  const p = trial.protocolSection;

  // RUNX1 special case — broader text search
  if (tenantKey === "RUNX1") {
    const haystack = [
      ...(p.conditionsModule?.conditions || []),
      ...(p.conditionsModule?.keywords || []),
      p.identificationModule?.briefTitle || "",
      p.descriptionModule?.briefSummary || "",
      p.descriptionModule?.detailedDescription || "",
    ]
      .join(" ")
      .toLowerCase();

    return config.required.some((term) => haystack.includes(term.toLowerCase()));
  }

  const conditions = p.conditionsModule?.conditions || [];
  const haystack = conditions.join(" ").toLowerCase();

  const matchesRequired = config.required.some((term) =>
    haystack.includes(term.toLowerCase())
  );
  if (!matchesRequired) return false;

  if (config.exclude?.length) {
    const hasExcluded = config.exclude.some((term) =>
      haystack.includes(term.toLowerCase())
    );
    if (hasExcluded) return false;
  }

  return true;
}

/**
 * SHA256 hash of the trial fields that, if changed, would warrant regenerating AI content.
 */
export function buildSourceHash(trial) {
  const p = trial.protocolSection;
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        title: p.identificationModule?.briefTitle ?? "",
        conditions: p.conditionsModule?.conditions ?? [],
        eligibility: p.eligibilityModule?.eligibilityCriteria ?? "",
        status: p.statusModule?.overallStatus ?? "",
      })
    )
    .digest("hex");
}

/**
 * Normalize ClinicalTrials.gov dates to ISO YYYY-MM-DD.
 * Handles partial dates (YYYY-MM) and returns null for invalid input.
 */
export function normalizeDate(dateStr) {
  if (!dateStr) return null;
  if (/^\d{4}-\d{2}$/.test(dateStr)) return `${dateStr}-01`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  return null;
}
