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
      COALESCE(short_title_manual, short_title) AS short_title
    FROM clinical_trials
    WHERE tenant = ${tenant}
      AND is_active = true
      AND overall_status IN (
        'RECRUITING',
        'NOT_YET_RECRITING',
        'ENROLLING_BY_INVITATION'
      )
    ORDER BY last_synced_at DESC
  `;

  return NextResponse.json({ trials });
}
