import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { requireAdmin } from "@/lib/adminGuard";

/**
 * POST: verify a trial. Stores snapshot of verifier in `verified_by` JSONB.
 * Body: { profileId: number } — looks up profile and snapshots
 *   { userId, name, title, degree, university, photo, email, role }
 *
 * Auth: admin only (researchers verify via the regular admin edit page once they have
 *       trial_assignments — but flipping verification is admin-controlled to start).
 */
export async function POST(req, context) {
  const authResult = requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  const { nctId } = await context.params;

  try {
    const { profileId } = await req.json();
    if (!profileId) {
      return NextResponse.json(
        { success: false, error: "profileId required" },
        { status: 400 }
      );
    }

    const tenant = process.env.NEXT_PUBLIC_SITE_KEY;

    // Fetch profile to snapshot
    const profileRows = await sql`
      SELECT user_id, name, title, degree, university, photo, email
      FROM profile
      WHERE user_id = ${profileId}
      LIMIT 1
    `;
    if (profileRows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Profile not found" },
        { status: 404 }
      );
    }

    const p = profileRows[0];
    const verifiedBy = {
      userId: p.user_id,
      name: p.name,
      title: p.title,
      degree: p.degree,
      university: p.university,
      photo: p.photo,
      email: p.email,
      verifiedAt: new Date().toISOString(),
    };

    const result = await sql`
  UPDATE clinical_trials
  SET verified_by = ${JSON.stringify(verifiedBy)}::jsonb,
      verified_at = NOW(),
      workflow_status = 'published',
      published_at = NOW()
  WHERE nct_id = ${nctId}
    AND LOWER(tenant) = LOWER(${tenant})
  RETURNING
    nct_id,
    verified_by,
    verified_at,
    workflow_status,
    published_at
`;

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: "Trial not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, trial: result[0] });
  } catch (err) {
    console.error("Verify error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE: remove verification (admin only).
 */
export async function DELETE(req, context) {
  const authResult = requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  const { nctId } = await context.params;

  try {
    const tenant = process.env.NEXT_PUBLIC_SITE_KEY;
    const result = await sql`
      UPDATE clinical_trials
      SET verified_by = NULL,
          verified_at = NULL,
          workflow_status = 'editing',
          published_at = NULL
      WHERE nct_id = ${nctId}
        AND LOWER(tenant) = LOWER(${tenant})
      RETURNING nct_id
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: "Trial not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Unverify error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
