export const revalidate = 0;

import { sql } from "@/lib/neon";
import { SUPPORTED_LANGUAGES } from "@/lib/translationWarnings";
import { translatePlainText } from "@/utils/apiHelpers";

const validLanguages = new Set(SUPPORTED_LANGUAGES.map((l) => l.code));

const TRANSLATABLE_FIELDS = [
  "short_title",
  "ai_summary",
  "ai_purpose",
  "ai_treatments",
  "ai_design",
  "ai_eligibility",
  "ai_participation",
  "ai_leadership",
  "ai_prior_research",
  "ai_locations",
];

export async function GET(request, { params }) {
  try {
    const { nctId } = await params;
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get("lang");

    if (!lang || !validLanguages.has(lang)) {
      return Response.json(
        { error: `Invalid language. Supported: ${[...validLanguages].join(", ")}` },
        { status: 400 }
      );
    }

    const langInfo = SUPPORTED_LANGUAGES.find((l) => l.code === lang);
    const tenant = process.env.NEXT_PUBLIC_SITE_KEY;

    // Check cache
    const cached = await sql`
      SELECT translated_short_title, translated_ai_summary,
             translated_ai_purpose, translated_ai_treatments,
             translated_ai_design, translated_ai_eligibility,
             translated_ai_participation, translated_ai_leadership,
             translated_ai_prior_research, translated_ai_locations,
             translated_custom_questions, translated_findings
      FROM trial_translations
      WHERE nct_id = ${nctId} AND language = ${lang}
      LIMIT 1
    `;

    if (cached.length > 0) {
      return Response.json({ language: lang, ...cached[0], cached: true });
    }

    // Fetch original (use manual override if exists)
    const rows = await sql`
      SELECT
        COALESCE(short_title_manual, short_title) AS short_title,
        COALESCE(ai_summary_manual, ai_summary) AS ai_summary,
        COALESCE(ai_purpose_manual, ai_purpose) AS ai_purpose,
        COALESCE(ai_treatments_manual, ai_treatments) AS ai_treatments,
        COALESCE(ai_design_manual, ai_design) AS ai_design,
        COALESCE(ai_eligibility_manual, ai_eligibility) AS ai_eligibility,
        COALESCE(ai_participation_manual, ai_participation) AS ai_participation,
        COALESCE(ai_leadership_manual, ai_leadership) AS ai_leadership,
        COALESCE(ai_prior_research_manual, ai_prior_research) AS ai_prior_research,
        COALESCE(ai_locations_manual, ai_locations) AS ai_locations,
        custom_questions, findings
      FROM clinical_trials
      WHERE nct_id = ${nctId}
        AND LOWER(tenant) = LOWER(${tenant})
      LIMIT 1
    `;

    if (rows.length === 0) {
      return Response.json({ error: "Trial not found" }, { status: 404 });
    }

    const trial = rows[0];

    // Translate all default fields in parallel
    const translations = await Promise.all(
      TRANSLATABLE_FIELDS.map((field) =>
        trial[field] ? translatePlainText(trial[field], lang, langInfo.name) : Promise.resolve(null)
      )
    );

    const translatedMap = {};
    TRANSLATABLE_FIELDS.forEach((field, i) => {
      translatedMap[`translated_${field}`] = translations[i];
    });

    // Translate custom questions (each Q&A)
    let translatedCustom = null;
    if (Array.isArray(trial.custom_questions) && trial.custom_questions.length > 0) {
      translatedCustom = await Promise.all(
        trial.custom_questions.map(async (q) => ({
          ...q,
          question: q.question ? await translatePlainText(q.question, lang, langInfo.name) : "",
          answer: q.answer ? await translatePlainText(q.answer, lang, langInfo.name) : "",
        }))
      );
    }

    // Translate findings (if present)
    const translatedFindings = trial.findings
      ? await translatePlainText(trial.findings, lang, langInfo.name)
      : null;

    // Cache
    await sql`
      INSERT INTO trial_translations (
        nct_id, language,
        translated_short_title, translated_ai_summary,
        translated_ai_purpose, translated_ai_treatments,
        translated_ai_design, translated_ai_eligibility,
        translated_ai_participation, translated_ai_leadership,
        translated_ai_prior_research, translated_ai_locations,
        translated_custom_questions, translated_findings
      ) VALUES (
        ${nctId}, ${lang},
        ${translatedMap.translated_short_title},
        ${translatedMap.translated_ai_summary},
        ${translatedMap.translated_ai_purpose},
        ${translatedMap.translated_ai_treatments},
        ${translatedMap.translated_ai_design},
        ${translatedMap.translated_ai_eligibility},
        ${translatedMap.translated_ai_participation},
        ${translatedMap.translated_ai_leadership},
        ${translatedMap.translated_ai_prior_research},
        ${translatedMap.translated_ai_locations},
        ${translatedCustom ? JSON.stringify(translatedCustom) : null}::jsonb,
        ${translatedFindings}
      )
      ON CONFLICT (nct_id, language) DO UPDATE SET
        translated_short_title = EXCLUDED.translated_short_title,
        translated_ai_summary = EXCLUDED.translated_ai_summary,
        translated_ai_purpose = EXCLUDED.translated_ai_purpose,
        translated_ai_treatments = EXCLUDED.translated_ai_treatments,
        translated_ai_design = EXCLUDED.translated_ai_design,
        translated_ai_eligibility = EXCLUDED.translated_ai_eligibility,
        translated_ai_participation = EXCLUDED.translated_ai_participation,
        translated_ai_leadership = EXCLUDED.translated_ai_leadership,
        translated_ai_prior_research = EXCLUDED.translated_ai_prior_research,
        translated_ai_locations = EXCLUDED.translated_ai_locations,
        translated_custom_questions = EXCLUDED.translated_custom_questions,
        translated_findings = EXCLUDED.translated_findings,
        created_at = NOW()
    `;

    return Response.json({
      language: lang,
      ...translatedMap,
      translated_custom_questions: translatedCustom,
      translated_findings: translatedFindings,
      cached: false,
    });
  } catch (error) {
    console.error("Error translating trial:", error);
    return Response.json({ error: "Failed to translate trial" }, { status: 500 });
  }
}
