import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/adminGuard";
import { storeMagicLink } from "@/lib/magicLinks";
import { sendResearcherInviteEmail } from "@/lib/email";
import { tenant } from "@/lib/config";
import bcrypt from "bcryptjs";
import crypto from "crypto";

/**
 * GET: list all researchers + their assigned trials for this tenant.
 */
export async function GET(req) {
  const authResult = requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    // Researchers are stored in email_credentials with role='researcher'
    const researchers = await query(
      `SELECT ec.id, ec.email, ec.first_name, ec.last_name, ec.role, p.name, p.title
       FROM email_credentials ec
       LEFT JOIN profile p ON p.user_id = ec.id
       WHERE ec.role = 'researcher'
       ORDER BY ec.id DESC`
    );

    // Assignments
    const tenantKey = process.env.NEXT_PUBLIC_SITE_KEY;
    const assignmentRows = await sql`
      SELECT ta.id, ta.researcher_id, ta.nct_id, ta.assigned_at,
             COALESCE(ct.short_title_manual, ct.short_title) AS short_title
      FROM trial_assignments ta
      LEFT JOIN clinical_trials ct ON ct.nct_id = ta.nct_id
        AND LOWER(ct.tenant) = LOWER(${tenantKey})
      ORDER BY ta.assigned_at DESC
    `;

    // Group assignments by researcher
    const byResearcher = {};
    assignmentRows.forEach((a) => {
      if (!byResearcher[a.researcher_id]) byResearcher[a.researcher_id] = [];
      byResearcher[a.researcher_id].push({
        nctId: a.nct_id,
        shortTitle: a.short_title,
        assignedAt: a.assigned_at,
      });
    });

    return NextResponse.json({
      success: true,
      researchers: researchers.rows.map((r) => ({
        ...r,
        assignments: byResearcher[r.id] || [],
      })),
    });
  } catch (err) {
    console.error("List trial-assignments error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

/**
 * POST: invite a researcher and assign trials.
 * Body: { email, firstName, lastName, nctIds: string[], sendEmail?: boolean }
 *
 * Flow:
 *  1. Upsert email_credentials row with role='researcher' (random password — researcher uses magic link)
 *  2. Ensure profile row exists
 *  3. Insert trial_assignments rows (ON CONFLICT DO NOTHING)
 *  4. Create magic link with redirect_url=/researcher/dashboard
 *  5. Optionally send email
 */
export async function POST(req) {
  const authResult = requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { email, firstName, lastName, nctIds = [], sendEmail = true } =
      await req.json();

    if (!email || !Array.isArray(nctIds)) {
      return NextResponse.json(
        { success: false, error: "email and nctIds required" },
        { status: 400 }
      );
    }

    // Upsert researcher
    const existing = await query(
      `SELECT id, role FROM email_credentials WHERE email = $1 LIMIT 1`,
      [email]
    );

    let researcherId;
    if (existing.rows.length > 0) {
      researcherId = existing.rows[0].id;
      // Upgrade role to researcher if currently 'user' (don't downgrade admin)
      if (existing.rows[0].role === "user") {
        await query(
          `UPDATE email_credentials SET role = 'researcher' WHERE id = $1`,
          [researcherId]
        );
      }
    } else {
      // Create with random password (researcher will use magic link)
      const randomPassword = crypto.randomBytes(24).toString("hex");
      const passwordHash = await bcrypt.hash(randomPassword, 10);
      const insertResult = await query(
        `INSERT INTO email_credentials (email, first_name, last_name, password_hash, role)
         VALUES ($1, $2, $3, $4, 'researcher')
         RETURNING id`,
        [email, firstName || "", lastName || "", passwordHash]
      );
      researcherId = insertResult.rows[0].id;
    }

    // Ensure profile row
    const profileExists = await query(
      `SELECT user_id FROM profile WHERE user_id = $1 LIMIT 1`,
      [researcherId]
    );
    if (profileExists.rows.length === 0) {
      const fullName = [firstName, lastName].filter(Boolean).join(" ") || email.split("@")[0];
      await query(
        `INSERT INTO profile (user_id, email, name) VALUES ($1, $2, $3)`,
        [researcherId, email, fullName]
      );
    }

    // Assign trials
    if (nctIds.length > 0) {
      for (const nctId of nctIds) {
        await sql`
          INSERT INTO trial_assignments (researcher_id, nct_id, assigned_by)
          VALUES (${researcherId}, ${nctId}, ${authResult.id || null})
          ON CONFLICT (researcher_id, nct_id) DO NOTHING
        `;
      }
    }

    // Create magic link
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    const redirectUrl = "/researcher/dashboard";

    await storeMagicLink({ email, tokenHash, redirectUrl, expiresAt });

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      req.headers.get("origin") ||
      `https://${tenant.domain}`;
    const magicUrl = `${baseUrl}/api/magic-link/verify?token=${token}`;

    if (sendEmail) {
      try {
        await sendResearcherInviteEmail({
          tenant,
          email,
          url: magicUrl,
          inviterName: authResult.name,
          trialCount: nctIds.length,
        });
      } catch (e) {
        console.error("Email send failed (continuing):", e.message);
      }
    }

    return NextResponse.json({
      success: true,
      researcherId,
      magicUrl,
      assignedCount: nctIds.length,
    });
  } catch (err) {
    console.error("Create trial-assignment error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE: remove an assignment.
 * Body: { researcherId, nctId }
 */
export async function DELETE(req) {
  const authResult = requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { researcherId, nctId } = await req.json();
    if (!researcherId || !nctId) {
      return NextResponse.json(
        { success: false, error: "researcherId and nctId required" },
        { status: 400 }
      );
    }

    await sql`
      DELETE FROM trial_assignments
      WHERE researcher_id = ${researcherId} AND nct_id = ${nctId}
    `;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete trial-assignment error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
