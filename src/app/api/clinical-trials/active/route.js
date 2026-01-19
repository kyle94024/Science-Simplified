import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";

export async function GET() {
  try {
    const tenant = process.env.NEXT_PUBLIC_SITE_KEY;

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Missing site tenant" },
        { status: 400 },
      );
    }

    const trials = await sql`
      SELECT
        nct_id,
        COALESCE(short_title_manual, short_title) AS short_title,
        COALESCE(ai_summary_manual, ai_summary)   AS ai_summary,
        tenant,
        overall_status,
        start_date,
        primary_completion_date,
        conditions,

        raw_data->'protocolSection'->'contactsLocationsModule'->'locations'->0->>'city'
          AS location_city,
        raw_data->'protocolSection'->'contactsLocationsModule'->'locations'->0->>'state'
          AS location_state,
        raw_data->'protocolSection'->'contactsLocationsModule'->'locations'->0->>'country'
          AS location_country,
          raw_data->'protocolSection'->'contactsLocationsModule'->'locations'
  AS locations,

        raw_data->'protocolSection'->'eligibilityModule'->>'minimumAge' AS min_age,
        raw_data->'protocolSection'->'eligibilityModule'->>'maximumAge' AS max_age,

        LOWER(
          raw_data->'protocolSection'->'designModule'->>'studyType'
        ) AS study_type

      FROM clinical_trials
      WHERE is_active = true
        AND tenant = ${tenant}
        AND overall_status IN ('RECRUITING', 'ENROLLING_BY_INVITATION')

        -- 🔒 ABSOLUTE GATES (DO NOT REMOVE)
        AND COALESCE(short_title_manual, short_title) IS NOT NULL
        AND COALESCE(ai_summary_manual, ai_summary) IS NOT NULL

      ORDER BY ai_summary_updated_at DESC
    `;

    return NextResponse.json({ success: true, trials });
  } catch (err) {
    console.error("ACTIVE TRIALS ERROR:", err);
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 },
    );
  }
}
