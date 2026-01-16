import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";

export async function GET(req, { params }) {
  const { nctId } = params;
  const tenant = process.env.NEXT_PUBLIC_SITE_KEY;

  if (!tenant) {
    return NextResponse.json(
      { success: false, error: "Missing site tenant" },
      { status: 400 }
    );
  }

  try {
    const result = await sql`
      SELECT
        nct_id,
        tenant,
        overall_status,
        start_date,
        primary_completion_date,
        completion_date,
        last_update_date,
        conditions,
        keywords,

        COALESCE(short_title_manual, short_title)               AS short_title,
        COALESCE(ai_summary_manual, ai_summary)                 AS ai_summary,
        COALESCE(ai_purpose_manual, ai_purpose)                 AS ai_purpose,
        COALESCE(ai_treatments_manual, ai_treatments)           AS ai_treatments,
        COALESCE(ai_design_manual, ai_design)                   AS ai_design,
        COALESCE(ai_eligibility_manual, ai_eligibility)         AS ai_eligibility,
        COALESCE(ai_participation_manual, ai_participation)     AS ai_participation,
        COALESCE(ai_leadership_manual, ai_leadership)           AS ai_leadership,
        COALESCE(ai_locations_manual, ai_locations)             AS ai_locations,
        COALESCE(ai_prior_research_manual, ai_prior_research)   AS ai_prior_research,

        raw_data
      FROM clinical_trials
      WHERE nct_id = ${nctId}
        AND tenant = ${tenant}
        AND is_active = true
      LIMIT 1
    `;

    if (!result.length) {
      return NextResponse.json(
        { success: false, trial: null },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      trial: result[0],
    });
  } catch (err) {
    console.error("TRIAL DETAIL ERROR:", err);
    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}