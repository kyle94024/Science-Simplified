import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import OpenAI from "openai";
import crypto from "crypto";
import { Nfc } from "lucide-react";

const SYSTEM_PROMPT = `
You are a medical communicator trained to write clinical information for patients
at a high-school reading level (grade 10–12).

Rewrite the provided text to be:
- Clear, friendly, accurate
- Non-technical and non-promissory
- Calm and neutral in tone

Avoid medical jargon when possible.
Define unavoidable terms in plain language.
Keep sentences short and conversational.
Do NOT guarantee benefit.
Do NOT define neurofibromatosis, schwannomatosis, hidradenitis, or epidermolysis bullosa.
`;

const TENANT_CONFIG = {
  HS: {
    required: ["hidradenitis suppurativa", "hidradenitis"],
    exclude: ["mood", "parkinson", "glioblastoma"],
  },
  NF: {
    required: ["neurofibromatosis", "nf1", "nf2", "schwannomatosis"],
    exclude: [],
  },
  EB: {
    required: ["epidermolysis bullosa"],
    exclude: [],
  },

  // // FUTURE TENANTS
  // CF: {
  //   required: ["cystic fibrosis"],
  //   exclude: [],
  // },
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* ---------------- helpers ---------------- */

function normalizeDate(dateStr) {
  if (!dateStr) return null;
  if (/^\d{4}-\d{2}$/.test(dateStr)) return `${dateStr}-01`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  return null;
}

function trialMatchesTenant(trial, tenantKey) {
  const config = TENANT_CONFIG[tenantKey];
  if (!config) return false;

  const conditions = trial.protocolSection?.conditionsModule?.conditions || [];

  const haystack = conditions.join(" ").toLowerCase();

  // MUST match at least one required term
  const matchesRequired = config.required.some((term) =>
    haystack.includes(term.toLowerCase())
  );

  if (!matchesRequired) return false;

  // MUST NOT contain excluded terms
  if (config.exclude?.length) {
    const hasExcluded = config.exclude.some((term) =>
      haystack.includes(term.toLowerCase())
    );
    if (hasExcluded) return false;
  }

  return true;
}

function buildSourceHash(trial) {
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

async function aiCall(prompt) {
  const res = await openai.chat.completions.create({
    model: "gpt-5.2",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
  });

  return res.choices[0].message.content.trim();
}

/* ---------- SHORT TITLE ---------- */
async function generateShortTitle(trial) {
  const p = trial.protocolSection;
  const studyType = p.designModule?.studyType?.toLowerCase() || "";
  const conditions = p.conditionsModule?.conditions?.join(", ") || "";
  const drugs = p.armsInterventionsModule?.interventions
    ?.map((i) => i.name)
    .filter(Boolean)
    .join(", ");

  if (studyType === "interventional" && drugs) {
    const drugsText = drugs || "Not specified";
    const conditionsText = conditions || "Not specified";

    const prompt = `
Create a short, patient-friendly study title.

Rules (must follow ALL):
- Format EXACTLY: [Drug or Drugs] for [Specific disease or tumor]
- Use the SPECIFIC tumor or condition being treated
- If the condition occurs within a larger disorder, name only the tumor
- Use real drug name(s)
- 3–6 words total
- No punctuation
- No phase numbers
- Do NOT use the words “study”, “trial”, or “treatment”

Drug(s): ${drugsText}
Condition being treated: ${conditionsText}

Return ONLY the title.
`;
    const res = await openai.chat.completions.create({
      model: "gpt-5.2",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
    });
    return res.choices[0].message.content.trim();
  }

  const prompt = `
You are writing a short, patient-facing title for a clinical research study.

Rules:
- 3–5 words
- Clear and descriptive
- Written for patients
- No punctuation
- No phase numbers

Conditions: ${conditions}

Study description: ${p.descriptionModule?.briefSummary || ""}`;

  const res = await openai.chat.completions.create({
    model: "gpt-5.2",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
  });
  return res.choices[0].message.content.trim();
}

/* ---------- SUMMARY ---------- */
async function generatePatientSummary(trial) {
  const p = trial.protocolSection;

  const conditions =
    p.conditionsModule?.conditions?.join(", ") || "the condition being studied";

  const studyType = p.designModule?.studyType?.toLowerCase() || "observational";

  const interventions =
    p.armsInterventionsModule?.interventions
      ?.map((i) => i.name)
      .filter(Boolean) || [];

  return aiCall(`
Write ONE clear, patient-friendly summary paragraph (5–7 sentences).

Explain:
1. The specific disease or tumor being treated (be precise)
2. What type of study this is (interventional or observational)
3. What drug, device, or approach is being tested
4. What type of drug or approach this is and how it works in simple terms
5. What participants are asked to do
6. How the information from the study will be used

STRICT RULES (must follow ALL):
- Use plain text only
- DO NOT use markdown, asterisks (*), bold, italics, or symbols
- Always name the SPECIFIC disease or tumor being treated
- If the condition is part of a genetic disorder, name the tumor, not the disorder
- If a drug is tested, explain how it works in ONE simple sentence
- Do NOT promise benefit
- Do NOT describe disease biology in detail
- Do NOT mention missing or unclear information
- Calm, neutral, plain language
- One paragraph only

Study type:
${studyType}

Condition or tumor treated:
${conditions}

Drug(s) or intervention(s):
${interventions.length ? interventions.join(", ") : "None"}
`);
}

/* ---------- DROPDOWNS ---------- */

async function generatePurpose(trial) {
  const p = trial.protocolSection;

  const indication = p.conditionsModule?.conditions?.join(", ") || "";

  const drugs = p.armsInterventionsModule?.interventions
    ?.map((i) => i.name)
    .filter(Boolean)
    .join(", ");

  const source = [
    p.identificationModule?.briefSummary,
    p.descriptionModule?.briefSummary,
    p.descriptionModule?.detailedDescription,
  ]
    .filter(Boolean)
    .join("\n\n");

  const result = await aiCall(`
Answer this question for a patient:

"What is the purpose of this study?"

STRICT RULES (must follow ALL):
- Clearly state WHAT drug, therapy, or approach is being tested
- Clearly state the SPECIFIC disease, tumor, or condition being treated
  (not just the broader diagnosis)
- Explain WHAT the study is measuring (for example: tumor shrinkage, safety, side effects, symptom control)
- Use concrete, plain language
- Do NOT describe disease biology
- Do NOT use vague phrases like:
  "to better understand"
  "researchers want to learn more"
  "being evaluated"
  "for future research"
- Do NOT mention missing information
- Do NOT mention ClinicalTrials.gov
- 2–3 sentences total

If the purpose cannot be clearly determined, return EXACTLY this sentence:
"The purpose of this study is to evaluate a specific treatment approach described by the study team."

Indication:
${indication}

Drug(s) or intervention(s):
${drugs || "Not specified"}

Study description:
${source}
`);

  const badSignals = [
    "better understand",
    "learn more",
    "future research",
    "being evaluated",
    "being reviewed",
    "focuses on",
    "not enough information",
  ];

  if (
    !result ||
    result.length < 60 ||
    badSignals.some((p) => result.toLowerCase().includes(p))
  ) {
    return "The purpose of this study is to evaluate a specific treatment approach described by the study team.";
  }

  return result;
}

async function generateTreatments(trial) {
  const interventions =
    trial.protocolSection?.armsInterventionsModule?.interventions
      ?.map((i) => i.name)
      .filter(Boolean) || [];

  // ✅ SAFE FALLBACK — NEVER null
  if (!interventions.length) {
    return "This study does not test a specific drug or device.";
  }

  const result = await aiCall(`
Answer this question for a patient:

"What treatments are being tested?"

Rules:
- Clearly name the treatment(s)
- If the study does not explain how they work, say so briefly and neutrally
- Do NOT mention missing text
- Do NOT ask for more information
- Do NOT speculate
- 1–2 sentences
- Plain language

Treatments:
${interventions.join(", ")}
`);

  const forbidden = [
    "paste",
    "provide more",
    "not enough information",
    "cannot determine",
    "i need more",
  ];

  if (!result || forbidden.some((f) => result.toLowerCase().includes(f))) {
    return `The study is testing ${interventions.join(", ")}.`;
  }

  return result.trim();
}

async function generateDesign(trial) {
  const p = trial.protocolSection;
  const studyType = p.designModule?.studyType?.toLowerCase();

  // OBSERVATIONAL
  if (studyType === "observational") {
    const text = p.detailedDescription || p.designModule?.description || "";

    if (!text) {
      return "This is an observational study where researchers collect information over time without assigning treatments or interventions.";
    }

    return aiCall(`
Explain how this observational study works.

Rules:
- Describe what information is collected and how participants are followed
- Mention surveys, interviews, medical record review, imaging, or follow-ups if listed
- Do NOT describe treatments or assignments
- Do NOT ask for more information
- Do NOT mention missing text
- 2–4 sentences
- Plain language

Text:
${text}
`);
  }

  // INTERVENTIONAL
  const source = [
    p.designModule?.studyType,
    p.designModule?.allocation,
    p.designModule?.interventionModel,
    p.designModule?.masking,
    p.armsInterventionsModule?.armGroups
      ?.map((a) => a.label + ": " + (a.description || ""))
      .join("\n"),
    p.detailedDescription,
  ]
    .filter(Boolean)
    .join("\n\n");

  return aiCall(`
Explain how this study works for someone who joins.

Rules:
- Describe STEP BY STEP what participants will do
- Mention groups and what each group receives, if applicable
- Mention surveys, interviews, videos, navigation, follow-ups if listed
- Do NOT define study types
- Do NOT use generic phrases like "the study team will explain"
- 3–5 sentences
- Must be specific to this study

Text:
${source}
`);
}

async function generateEligibility(trial) {
  return aiCall(`
Create two bullet lists:
- Who may be able to join
- Who may not be able to join

Rules:
- Use only the eligibility text
- Plain language
- No extra explanations

Text:
${trial.protocolSection?.eligibilityModule?.eligibilityCriteria || ""}
`);
}

// async function generateRisks(trial) {
//   const text = trial.protocolSection?.detailedDescription || "";

//   return aiCall(`
// Explain risks or side effects of participation.

// Rules:
// - Use ONLY risks explicitly mentioned
// - If none are listed, say EXACTLY:
//   "The study does not mention whether there are any risks or side effects. The study team will explain possible risks when sharing details about the study."
// - Do NOT generalize
// - 1–2 sentences max

// Text:
// ${text}
// `);
// }

async function generateParticipation(trial) {
  const text =
    trial.protocolSection?.detailedDescription ||
    trial.protocolSection?.descriptionModule?.briefSummary ||
    "";

  if (!text || text.trim().length < 40) {
    return "The study team will explain what participation involves.";
  }

  const result = await aiCall(`
You are writing for patients.

Answer the question:
"What is participation like?"

STRICT RULES (must follow ALL):
- Describe what participants actually DO
- Mention visits, procedures, surveys, imaging, medications, or follow-ups if listed
- If randomized, say participants may be assigned to a group
- Do NOT mention missing information
- Do NOT say text was not provided
- Do NOT hedge or apologize
- Do NOT ask questions
- 2–3 sentences MAX
- Plain, neutral language
- Use ONLY the text provided
- If participation details are vague, give a general but neutral description

Text:
${text}
`);

  const badPhrases = [
    "not provided",
    "wasn't provided",
    "missing",
    "no information",
    "cannot summarize",
    "can't summarize",
    "please",
    "paste",
    "looks like",
    "based on the text provided",
  ];

  if (
    !result ||
    result.length < 20 ||
    badPhrases.some((p) => result.toLowerCase().includes(p))
  ) {
    return "The study team will explain what participation involves.";
  }

  return result.trim();
}

// async function generatePrivacy() {
//   return aiCall(`
// Explain how participant privacy is protected.

// Rules:
// - One short paragraph
// - Patient-friendly
// `);
// }

async function generateLeadership(trial) {
  const sponsor =
    trial.protocolSection?.sponsorCollaboratorsModule?.leadSponsor?.name;

  const contacts =
    trial.protocolSection?.contactsLocationsModule?.centralContacts || [];

  // Clean fallback when no contact info exists
  if (!sponsor && contacts.length === 0) {
    return "This study is being run by the study team listed on ClinicalTrials.gov.";
  }

  if (contacts.length === 0) {
    return `This study is being run by ${sponsor}.`;
  }

  return aiCall(`
Explain who is running the study.

Rules (must follow ALL):
- Use plain text only
- Do NOT ask the reader for information
- Do NOT say "share it and I can add it"
- Do NOT mention missing information
- Name the sponsor
- List contact details exactly as provided
- Short and factual

Sponsor:
${sponsor || ""}

Contacts:
${contacts
  .map(
    (c) =>
      `${c.name} (${c.phone || "no phone listed"}, ${
        c.email || "no email listed"
      })`
  )
  .join("\n")}
`);
}

async function generatePriorResearch(trial) {
  const condition =
    trial.protocolSection?.conditionsModule?.conditions?.join(", ");

  const interventions =
    trial.protocolSection?.armsInterventionsModule?.interventions
      ?.map((i) => i.name)
      .join(", ");

  return aiCall(`
You are writing a short "Prior Research" section for a patient-facing clinical trial summary.

This section should summarize **general background research** related to the condition and treatment,
and may include information from published literature (e.g. PubMed, prior clinical studies, or well-established research).

Important rules:
- Do NOT claim that this trial itself produced these results
- Do NOT invent study names, years, authors, or citations
- Speak generally (e.g. "previous studies have shown...", "earlier research suggests...")
- If little is known, say so clearly
- 1–2 short paragraphs, plain language

Condition:
${condition || "Not specified"}

Treatment / Intervention:
${interventions || "Not specified"}

Write the prior research summary now.
`);
}

function generateLocations(trial) {
  const locations =
    trial.protocolSection?.contactsLocationsModule?.locations || [];

  if (!locations.length) {
    return "This is a decentralized study, which means it can be done remotely.";
  }

  return locations
    .map((l) => `${l.city}, ${l.state}, ${l.country}`)
    .filter(Boolean)
    .join("; ");
}

/* ---------- SYNC ---------- */

export async function GET(req, context) {
  const { tenant } = await context.params;
  const TENANT = tenant?.toUpperCase();

  if (!TENANT || !TENANT_CONFIG[TENANT]) {
    return NextResponse.json(
      { success: false, error: "Invalid tenant" },
      { status: 400 }
    );
  }

  const SEARCH_TERMS = TENANT_CONFIG[TENANT].required;

  try {
    const url = new URL("https://clinicaltrials.gov/api/v2/studies");
    url.searchParams.set("query.cond", SEARCH_TERMS.join(" OR "));
    url.searchParams.set("pageSize", "50");

    const res = await fetch(url.toString());
    const { studies = [] } = await res.json();

    for (const study of studies) {
      const p = study.protocolSection;
      if (!trialMatchesTenant(study, TENANT)) {
        continue;
      }
      const nctId = p?.identificationModule?.nctId;
      if (!nctId) continue;

      const newHash = buildSourceHash(study);

      const existing = await sql`
        SELECT
  source_hash,
  last_synced_at,
  ai_purpose,
  ai_treatments,
  ai_design,
  ai_eligibility,
  ai_participation,
  ai_leadership,
  ai_prior_research,
  ai_locations
FROM clinical_trials
WHERE nct_id = ${nctId}
LIMIT 1
      `;

      const hasAllAI =
        existing[0]?.ai_purpose &&
        existing[0]?.ai_treatments &&
        existing[0]?.ai_design &&
        existing[0]?.ai_eligibility &&
        existing[0]?.ai_participation &&
        existing[0]?.ai_leadership &&
        existing[0]?.ai_prior_research &&
        existing[0]?.ai_locations;

      const shouldSkip =
        existing.length &&
        existing[0].source_hash === newHash &&
        new Date(existing[0].last_synced_at).getTime() > Date.now() - WEEK_MS &&
        hasAllAI;

      if (shouldSkip) continue;

      // ---------------- ATOMIC AI GENERATION ----------------
      let aiPayload;

      try {
        aiPayload = {
          shortTitle: await generateShortTitle(study),
          summary: await generatePatientSummary(study),
          purpose: await generatePurpose(study),
          treatments: await generateTreatments(study),
          design: await generateDesign(study),
          eligibility: await generateEligibility(study),
          participation: await generateParticipation(study),
          leadership: await generateLeadership(study),
          priorResearch: await generatePriorResearch(study),
          locations: generateLocations(study),
        };
      } catch (err) {
        console.error("AI generation failed for", nctId, err);
        continue; 
      }

      // HARD GATE — prevent half-generated rows
      if (
        !aiPayload.purpose ||
        !aiPayload.design ||
        !aiPayload.eligibility ||
        !aiPayload.participation ||
        !aiPayload.leadership ||
        !aiPayload.priorResearch ||
        !aiPayload.locations
      ) {
        continue;
      }

      await sql`
        INSERT INTO clinical_trials (
  nct_id, tenant, overall_status,
  start_date, primary_completion_date, completion_date, last_update_date,
  conditions, keywords, raw_data,
  short_title, ai_summary, ai_summary_updated_at,
  ai_purpose,
  ai_treatments,
  ai_design,
  ai_eligibility,
  ai_participation,
  ai_leadership,
  ai_prior_research,
  ai_locations,
  source_hash, is_active, last_synced_at
)
VALUES (
  ${nctId}, ${tenant}, ${p.statusModule?.overallStatus ?? null},
  ${normalizeDate(p.statusModule?.startDateStruct?.date)},
  ${normalizeDate(p.statusModule?.primaryCompletionDateStruct?.date)},
  ${normalizeDate(p.statusModule?.completionDateStruct?.date)},
  ${normalizeDate(p.statusModule?.lastUpdatePostDateStruct?.date)},
  ${p.conditionsModule?.conditions ?? []},
  ${p.conditionsModule?.keywords ?? []},
  ${JSON.stringify(study)}::jsonb,

  ${aiPayload.shortTitle},
  ${aiPayload.summary}, NOW(),

  ${aiPayload.purpose},
  ${aiPayload.treatments},
  ${aiPayload.design},
  ${aiPayload.eligibility},
  ${aiPayload.participation},
  ${aiPayload.leadership},
  ${aiPayload.priorResearch},
  ${aiPayload.locations},

  ${newHash}, true, NOW()
)
 ON CONFLICT (nct_id) DO UPDATE SET
  short_title = CASE
    WHEN clinical_trials.short_title_manual IS NULL
    THEN EXCLUDED.short_title
    ELSE clinical_trials.short_title
  END,

  ai_summary = CASE
    WHEN clinical_trials.ai_summary_manual IS NULL
    THEN EXCLUDED.ai_summary
    ELSE clinical_trials.ai_summary
  END,

  ai_purpose = CASE
    WHEN clinical_trials.ai_purpose_manual IS NULL
    THEN EXCLUDED.ai_purpose
    ELSE clinical_trials.ai_purpose
  END,

  ai_treatments = CASE
    WHEN clinical_trials.ai_treatments_manual IS NULL
    THEN EXCLUDED.ai_treatments
    ELSE clinical_trials.ai_treatments
  END,

  ai_design = CASE
    WHEN clinical_trials.ai_design_manual IS NULL
    THEN EXCLUDED.ai_design
    ELSE clinical_trials.ai_design
  END,

  ai_eligibility = CASE
    WHEN clinical_trials.ai_eligibility_manual IS NULL
    THEN EXCLUDED.ai_eligibility
    ELSE clinical_trials.ai_eligibility
  END,


  ai_participation = CASE
    WHEN clinical_trials.ai_participation_manual IS NULL
    THEN EXCLUDED.ai_participation
    ELSE clinical_trials.ai_participation
  END,


  ai_leadership = CASE
    WHEN clinical_trials.ai_leadership_manual IS NULL
    THEN EXCLUDED.ai_leadership
    ELSE clinical_trials.ai_leadership
  END,

  ai_prior_research = CASE
    WHEN clinical_trials.ai_prior_research_manual IS NULL
    THEN EXCLUDED.ai_prior_research
    ELSE clinical_trials.ai_prior_research
  END,

  ai_locations = CASE
    WHEN clinical_trials.ai_locations_manual IS NULL
    THEN EXCLUDED.ai_locations
    ELSE clinical_trials.ai_locations
  END,

  --  DO NOT overwrite source_hash if manual edits exist
  source_hash = CASE
    WHEN (
      clinical_trials.short_title_manual IS NOT NULL OR
      clinical_trials.ai_summary_manual IS NOT NULL OR
      clinical_trials.ai_purpose_manual IS NOT NULL
    )
    THEN clinical_trials.source_hash
    ELSE EXCLUDED.source_hash
  END,

  last_synced_at = NOW(),
  updated_at = NOW();
      `;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("SYNC ERROR:", err);
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}
