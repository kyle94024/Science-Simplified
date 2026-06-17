import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { requireAdmin } from "@/lib/adminGuard";

/**
 * POST: verify a trial (admin only). Stores a snapshot of the verifier in the
 * `verified_by` JSONB and publishes the trial.
 *
 * Body (all optional individually, but the result must have a name):
 *   - profileId:  number — snapshot a researcher profile as the base.
 *   - name:       string — override/set the displayed reviewer name.
 *   - degree:     string — override/set the displayed degree (e.g. "MD, PhD").
 *   - university: string — override/set the displayed affiliation.
 *   - title:      string — override/set the title.
 *
 * Usage:
 *   - New verification: send { profileId, name?, degree?, university? }. The
 *     profile provides defaults; any provided field overrides it.
 *   - Edit reviewer details on an already-verified trial: send just
 *     { name, degree, university } (no profileId) — overrides merge into the
 *     existing verified_by snapshot. The verification date is preserved.
 */
export async function POST(req, context) {
  const authResult = requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  const { nctId } = await context.params;

  try {
    const body = await req.json();
    const { profileId } = body;
    const tenant = process.env.NEXT_PUBLIC_SITE_KEY;

    // Build the base snapshot: from a selected profile, or — when an admin is
    // just editing the displayed name/degree — from the existing verified_by.
    let base = {};
    if (profileId) {
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
      base = {
        userId: p.user_id,
        name: p.name,
        title: p.title,
        degree: p.degree,
        university: p.university,
        photo: p.photo,
        email: p.email,
      };
    } else {
      const existing = await sql`
        SELECT verified_by
        FROM clinical_trials
        WHERE nct_id = ${nctId} AND LOWER(tenant) = LOWER(${tenant})
        LIMIT 1
      `;
      if (existing.length > 0 && existing[0].verified_by) {
        base = existing[0].verified_by;
      }
    }

    // Apply admin overrides — a provided value (incl. cleared string) wins.
    const pick = (override, fallback) =>
      override === undefined || override === null ? fallback : override;
    const clean = (v) => {
      const s = (v ?? "").toString().trim();
      return s.length ? s : null;
    };

    const verifiedBy = {
      userId: base.userId ?? null,
      name: clean(pick(body.name, base.name)),
      title: clean(pick(body.title, base.title)),
      degree: clean(pick(body.degree, base.degree)),
      university: clean(pick(body.university, base.university)),
      photo: base.photo ?? null,
      email: base.email ?? null,
    };

    if (!verifiedBy.name) {
      return NextResponse.json(
        {
          success: false,
          error: "A reviewer name is required (select a profile or enter a name).",
        },
        { status: 400 }
      );
    }

    // verified_by IS the source of truth for "published" — no separate
    // workflow_status/published_at columns. COALESCE preserves the original
    // verification date when an admin is only editing the reviewer's details.
    const result = await sql`
      UPDATE clinical_trials
      SET verified_by = ${JSON.stringify(verifiedBy)}::jsonb,
          verified_at = COALESCE(verified_at, NOW())
      WHERE nct_id = ${nctId}
        AND LOWER(tenant) = LOWER(${tenant})
      RETURNING
        nct_id,
        verified_by,
        verified_at
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: "Trial not found" },
        { status: 404 }
      );
    }

    // Publishing supersedes any pending "submitted for review" state.
    await sql`DELETE FROM trial_review_submissions WHERE nct_id = ${nctId}`;

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
          verified_at = NULL
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

    // Removing verification drops it back to 'editing' (derived from the
    // assignment); clear any stale review-submission row just in case.
    await sql`DELETE FROM trial_review_submissions WHERE nct_id = ${nctId}`;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Unverify error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
