import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { cookies } from "next/headers";
import { verify } from "jsonwebtoken";

export async function GET(req) {
  // Auth: must be researcher OR admin
  const cookieStore = await cookies();
  const token = cookieStore.get("auth")?.value;
  if (!token) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  let payload;
  try {
    payload = verify(token, process.env.JWT_SECRET || "your-secret-key");
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid token" },
      { status: 401 }
    );
  }

  if (!payload.isAdmin && payload.role !== "researcher" && payload.role !== "editor") {
    return NextResponse.json(
      { success: false, error: "Forbidden" },
      { status: 403 }
    );
  }

  try {
    const tenantKey = process.env.NEXT_PUBLIC_SITE_KEY;

    // Admin sees all trials for this tenant; researcher sees only assigned
    let trials;
    // workflow_status is derived (no column): published from verified_by,
    // review_submitted from trial_review_submissions, else editing/unassigned.
    if (payload.isAdmin && !payload.role) {
      trials = await sql`
        SELECT ct.nct_id,
               COALESCE(ct.short_title_manual, ct.short_title) AS short_title,
               COALESCE(ct.ai_summary_manual, ct.ai_summary) AS ai_summary,
               ct.overall_status,
               ct.verified_by,
               CASE
                 WHEN ct.verified_by IS NOT NULL THEN 'published'
                 WHEN EXISTS (SELECT 1 FROM trial_review_submissions trs WHERE trs.nct_id = ct.nct_id) THEN 'review_submitted'
                 WHEN EXISTS (SELECT 1 FROM trial_assignments ta WHERE ta.nct_id = ct.nct_id) THEN 'editing'
                 ELSE 'unassigned'
               END AS workflow_status,
               ct.archive_reason,
               ct.is_active,
               NULL AS assigned_at
        FROM clinical_trials ct
        WHERE LOWER(ct.tenant) = LOWER(${tenantKey})
        ORDER BY ct.last_synced_at DESC
        LIMIT 200
      `;
    } else {
      trials = await sql`
        SELECT ct.nct_id,
               COALESCE(ct.short_title_manual, ct.short_title) AS short_title,
               COALESCE(ct.ai_summary_manual, ct.ai_summary) AS ai_summary,
               ct.overall_status,
               ct.verified_by,
               CASE
                 WHEN ct.verified_by IS NOT NULL THEN 'published'
                 WHEN EXISTS (SELECT 1 FROM trial_review_submissions trs WHERE trs.nct_id = ct.nct_id) THEN 'review_submitted'
                 ELSE 'editing'
               END AS workflow_status,
               ct.archive_reason,
               ct.is_active,
               ta.assigned_at
        FROM trial_assignments ta
        JOIN clinical_trials ct ON ct.nct_id = ta.nct_id
        WHERE ta.researcher_id = ${payload.id}
          AND LOWER(ct.tenant) = LOWER(${tenantKey})
        ORDER BY ta.assigned_at DESC
      `;
    }

    return NextResponse.json({ success: true, trials });
  } catch (err) {
    console.error("Researcher assigned-trials error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
