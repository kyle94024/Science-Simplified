import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { cookies } from "next/headers";
import { verify } from "jsonwebtoken";

/**
 * Check auth: must be admin OR a researcher assigned to this trial.
 * Returns the decoded JWT payload on success, or a NextResponse on failure.
 */
async function requireAdminOrAssignedResearcher(req, nctId) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth")?.value;
  if (!token) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  let payload;
  try {
    payload = verify(token, process.env.JWT_SECRET || "your-secret-key");
  } catch {
    return NextResponse.json({ message: "Invalid token" }, { status: 401 });
  }

  if (payload.isAdmin || payload.role === "editor") return payload;

  if (payload.role === "researcher") {
    const r = await sql`
      SELECT 1 FROM trial_assignments
      WHERE researcher_id = ${payload.id} AND nct_id = ${nctId}
      LIMIT 1
    `;
    if (r.length > 0) return payload;
  }

  return NextResponse.json({ message: "Forbidden" }, { status: 403 });
}

/** GET single trial (admin or assigned researcher) */
export async function GET(req, context) {
  try {
    const { nctId } = await context.params;

    const { searchParams } = new URL(req.url);
    const tenant = searchParams.get("tenant") || process.env.NEXT_PUBLIC_SITE_KEY;

    if (!tenant) {
      return NextResponse.json({ error: "Missing tenant" }, { status: 400 });
    }

    const auth = await requireAdminOrAssignedResearcher(req, nctId);
    if (auth instanceof NextResponse) return auth;

    const result = await sql`
      SELECT *
      FROM clinical_trials
      WHERE nct_id = ${nctId}
        AND LOWER(tenant) = LOWER(${tenant})
      LIMIT 1
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "Trial not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      trial: result[0],
    });
  } catch (err) {
    console.error("ADMIN TRIAL GET ERROR:", err);
    return NextResponse.json(
      { error: "Failed to load trial" },
      { status: 500 }
    );
  }
}

/** PATCH manual edits (admin or assigned researcher) */
export async function PATCH(req, context) {
  try {
    const { nctId } = await context.params;

    const { searchParams } = new URL(req.url);
    const tenant = searchParams.get("tenant") || process.env.NEXT_PUBLIC_SITE_KEY;

    if (!tenant) {
      return NextResponse.json({ error: "Missing tenant" }, { status: 400 });
    }

    const auth = await requireAdminOrAssignedResearcher(req, nctId);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json(
        { error: "No fields provided" },
        { status: 400 }
      );
    }

    await sql`
      UPDATE clinical_trials
      SET
        short_title_manual        = ${body.short_title_manual ?? null},
        ai_summary_manual         = ${body.ai_summary_manual ?? null},
        ai_purpose_manual         = ${body.ai_purpose_manual ?? null},
        ai_treatments_manual      = ${body.ai_treatments_manual ?? null},
        ai_design_manual          = ${body.ai_design_manual ?? null},
        ai_eligibility_manual     = ${body.ai_eligibility_manual ?? null},
        ai_participation_manual   = ${body.ai_participation_manual ?? null},
        ai_leadership_manual      = ${body.ai_leadership_manual ?? null},
        ai_locations_manual       = ${body.ai_locations_manual ?? null},
        ai_prior_research_manual  = ${body.ai_prior_research_manual ?? null},
        custom_questions          = ${JSON.stringify(body.custom_questions ?? [])}::jsonb,
        hidden_questions          = ${body.hidden_questions ?? []},
        findings                  = ${body.findings ?? null},
        findings_url              = ${body.findings_url ?? null},
        findings_published_at     = ${body.findings ? new Date() : null},
        updated_at = NOW()
      WHERE nct_id = ${nctId}
        AND LOWER(tenant) = LOWER(${tenant})
    `;

    // Editing a trial supersedes a pending "submitted for review" state — it
    // drops back to 'editing' (derived). No-op for trials with no submission.
    await sql`DELETE FROM trial_review_submissions WHERE nct_id = ${nctId}`;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("ADMIN TRIAL PATCH ERROR:", err);
    return NextResponse.json({ error: err.message || "Update failed" }, { status: 500 });
  }
}
