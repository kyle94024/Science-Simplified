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
 * GET: list all researchers/experts + their assigned trials AND articles for this tenant.
 */
export async function GET(req) {
  const authResult = requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    // Researchers/experts are stored in email_credentials with role='researcher'
    const researchers = await query(
      `SELECT ec.id, ec.email, ec.first_name, ec.last_name, ec.role, p.name, p.title
       FROM email_credentials ec
       LEFT JOIN profile p ON p.user_id = ec.id
       WHERE ec.role = 'researcher'
       ORDER BY ec.id DESC`
    );

    // Trial assignments
    const tenantKey = process.env.NEXT_PUBLIC_SITE_KEY;
    const trialRows = await sql`
      SELECT ta.id, ta.researcher_id, ta.nct_id, ta.assigned_at,
             COALESCE(ct.short_title_manual, ct.short_title) AS short_title,
             (ct.verified_by IS NOT NULL) AS is_verified
      FROM trial_assignments ta
      LEFT JOIN clinical_trials ct ON ct.nct_id = ta.nct_id
        AND LOWER(ct.tenant) = LOWER(${tenantKey})
      ORDER BY ta.assigned_at DESC
    `;

    // Article assignments — article_assignments table uses editor_id, but researchers
    // (role='researcher') and editors are both stored in email_credentials, so we can
    // reuse this table. We join to pending_article (still in review queue) and to
    // published article (already verified) to give context to the admin.
    const articleRows = await query(
      `SELECT aa.editor_id AS researcher_id, aa.article_id,
              COALESCE(pa.title, a.title) AS title,
              CASE WHEN a.id IS NOT NULL THEN true ELSE false END AS is_published,
              (a.certifiedby IS NOT NULL) AS is_certified
       FROM article_assignments aa
       LEFT JOIN pending_article pa ON pa.id = aa.article_id
       LEFT JOIN article a ON a.id = aa.article_id
       WHERE aa.editor_id IN (SELECT id FROM email_credentials WHERE role = 'researcher')
       ORDER BY aa.article_id DESC`
    );

    // Group assignments by researcher
    const trialsByResearcher = {};
    trialRows.forEach((a) => {
      if (!trialsByResearcher[a.researcher_id]) trialsByResearcher[a.researcher_id] = [];
      trialsByResearcher[a.researcher_id].push({
        nctId: a.nct_id,
        shortTitle: a.short_title,
        assignedAt: a.assigned_at,
        isVerified: a.is_verified,
      });
    });

    const articlesByResearcher = {};
    articleRows.rows.forEach((a) => {
      if (!articlesByResearcher[a.researcher_id]) articlesByResearcher[a.researcher_id] = [];
      articlesByResearcher[a.researcher_id].push({
        articleId: a.article_id,
        title: a.title,
        isPublished: a.is_published,
        isCertified: a.is_certified,
      });
    });

    return NextResponse.json({
      success: true,
      researchers: researchers.rows.map((r) => ({
        ...r,
        trialAssignments: trialsByResearcher[r.id] || [],
        articleAssignments: articlesByResearcher[r.id] || [],
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
 * POST: invite a researcher/expert and assign trials and/or articles.
 * Body: { email, firstName, lastName, nctIds: string[], articleIds: number[], sendEmail?: boolean }
 *
 * Flow:
 *  1. Upsert email_credentials row with role='researcher' (random password — researcher uses magic link)
 *  2. Ensure profile row exists
 *  3. Insert trial_assignments rows (ON CONFLICT DO NOTHING)
 *  4. Insert article_assignments rows (using editor_id column, ON CONFLICT DO NOTHING)
 *  5. Create magic link with redirect_url=/researcher/dashboard
 *  6. Optionally send email
 */
export async function POST(req) {
  const authResult = requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const {
      email,
      firstName,
      lastName,
      nctIds = [],
      articleIds = [],
      sendEmail = true,
    } = await req.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: "email is required" },
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
    if (Array.isArray(nctIds) && nctIds.length > 0) {
      for (const nctId of nctIds) {
        await sql`
          INSERT INTO trial_assignments (researcher_id, nct_id, assigned_by)
          VALUES (${researcherId}, ${nctId}, ${authResult.id || null})
          ON CONFLICT (researcher_id, nct_id) DO NOTHING
        `;
      }
      // No workflow_status write needed — a trial with an assignment row derives
      // 'editing' automatically (see the status CASE in the list/dashboard APIs).
    }

    // Assign articles (reuse article_assignments table — editor_id column also holds researcher_id)
    if (Array.isArray(articleIds) && articleIds.length > 0) {
      for (const articleId of articleIds) {
        await query(
          `INSERT INTO article_assignments (editor_id, article_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [researcherId, articleId]
        );
      }
    }

    // Create magic link
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    const redirectUrl = "/researcher/dashboard";

    await storeMagicLink({ tenant, email, tokenHash, redirectUrl, expiresAt });

    // tenant.domain already includes the protocol (e.g. "https://www.runx1simplified.org")
    // so we use it directly without prefixing https://. NEXT_PUBLIC_SITE_URL also includes
    // the protocol when set on Vercel.
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      req.headers.get("origin") ||
      tenant.domain ||
      "";
    const magicUrl = `${baseUrl.replace(/\/$/, "")}/api/magic-link/verify?token=${token}`;

    if (sendEmail) {
      try {
        await sendResearcherInviteEmail({
          tenant,
          email,
          url: magicUrl,
          inviterName: authResult.name,
          trialCount: nctIds.length,
          articleCount: articleIds.length,
        });
      } catch (e) {
        console.error("Email send failed (continuing):", e.message);
      }
    }

    return NextResponse.json({
      success: true,
      researcherId,
      magicUrl,
      assignedTrials: nctIds.length,
      assignedArticles: articleIds.length,
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
 * Body: { researcherId, nctId } OR { researcherId, articleId }
 */
export async function DELETE(req) {
  const authResult = requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { researcherId, nctId, articleId } = await req.json();
    if (!researcherId || (!nctId && !articleId)) {
      return NextResponse.json(
        { success: false, error: "researcherId and (nctId or articleId) required" },
        { status: 400 }
      );
    }

    if (nctId) {
      await sql`
        DELETE FROM trial_assignments
        WHERE researcher_id = ${researcherId} AND nct_id = ${nctId}
      `;
    }

    if (articleId) {
      await query(
        `DELETE FROM article_assignments WHERE editor_id = $1 AND article_id = $2`,
        [researcherId, articleId]
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete trial-assignment error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
