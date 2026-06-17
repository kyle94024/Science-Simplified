import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const tenant = searchParams.get("tenant");

  if (!tenant) {
    return NextResponse.json({ error: "Missing tenant" }, { status: 400 });
  }

  // workflow_status + published_at are DERIVED (no columns on clinical_trials):
  //   published        => verified_by IS NOT NULL  (published_at = verified_at)
  //   review_submitted => row in trial_review_submissions
  //   editing          => assigned (row in trial_assignments)
  //   unassigned       => otherwise
  const trials = await sql`
    SELECT
      ct.nct_id,
      COALESCE(ct.short_title_manual, ct.short_title) AS short_title,
      ct.verified_by,
      ct.verified_at,
      ct.archive_reason,
      ct.overall_status,
      ct.verified_at AS published_at,
      CASE
        WHEN ct.verified_by IS NOT NULL THEN 'published'
        WHEN EXISTS (SELECT 1 FROM trial_review_submissions trs WHERE trs.nct_id = ct.nct_id) THEN 'review_submitted'
        WHEN EXISTS (SELECT 1 FROM trial_assignments ta WHERE ta.nct_id = ct.nct_id) THEN 'editing'
        ELSE 'unassigned'
      END AS workflow_status
    FROM clinical_trials ct
    WHERE LOWER(ct.tenant) = LOWER(${tenant})
      AND ct.is_active = true
      AND ct.overall_status IN (
        'RECRUITING',
        'NOT_YET_RECRUITING',
        'ENROLLING_BY_INVITATION'
      )
    ORDER BY
      -- trials submitted for review (and not yet verified) need attention first
      (ct.verified_by IS NULL
        AND EXISTS (SELECT 1 FROM trial_review_submissions trs WHERE trs.nct_id = ct.nct_id)) DESC,
      (ct.verified_by IS NOT NULL) ASC,  -- then unverified
      ct.last_synced_at DESC
  `;

  return NextResponse.json({ trials });
}
