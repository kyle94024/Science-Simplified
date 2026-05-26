import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";

export async function GET() {
  try {
    const tenant = process.env.NEXT_PUBLIC_SITE_KEY;
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Missing site tenant" },
        { status: 400 }
      );
    }

    const trials = await sql`
      SELECT
        nct_id,
        COALESCE(short_title_manual, short_title) AS short_title,
        COALESCE(ai_summary_manual, ai_summary) AS ai_summary,
        tenant,
        overall_status,
        conditions,
        verified_by,
        archive_reason,
        archived_at,
        findings,
        findings_url,
        findings_published_at,
        raw_data->'protocolSection'->'contactsLocationsModule'->'locations'->0->>'city' AS location_city,
        raw_data->'protocolSection'->'contactsLocationsModule'->'locations'->0->>'state' AS location_state,
        raw_data->'protocolSection'->'contactsLocationsModule'->'locations'->0->>'country' AS location_country,
        raw_data->'protocolSection'->'contactsLocationsModule'->'locations' AS locations,
        raw_data->'protocolSection'->'eligibilityModule'->>'minimumAge' AS min_age,
        raw_data->'protocolSection'->'eligibilityModule'->>'maximumAge' AS max_age,
        LOWER(raw_data->'protocolSection'->'designModule'->>'studyType') AS study_type
      FROM clinical_trials
      WHERE LOWER(tenant) = LOWER(${tenant})
        AND archive_reason = 'completed'
        AND COALESCE(short_title_manual, short_title) IS NOT NULL
      ORDER BY archived_at DESC NULLS LAST
    `;

    return NextResponse.json({ success: true, trials });
  } catch (err) {
    console.error("COMPLETED TRIALS ERROR:", err);
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}
