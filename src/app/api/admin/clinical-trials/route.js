import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const tenant = searchParams.get("tenant");

  if (!tenant) {
    return NextResponse.json({ error: "Missing tenant" }, { status: 400 });
  }

  const trials = await sql`
    SELECT
      nct_id,
      COALESCE(short_title_manual, short_title) AS short_title,
      verified_by,
      verified_at,
      archive_reason,
      overall_status
    FROM clinical_trials
    WHERE LOWER(tenant) = LOWER(${tenant})
      AND is_active = true
      AND overall_status IN (
        'RECRUITING',
        'NOT_YET_RECRUITING',
        'ENROLLING_BY_INVITATION'
      )
    ORDER BY
      (verified_by IS NOT NULL) ASC,  -- unverified first (need attention)
      last_synced_at DESC
  `;

  return NextResponse.json({ trials });
}
