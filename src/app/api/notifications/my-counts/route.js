export const revalidate = 0;

import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { sql } from "@/lib/neon";
import { cookies } from "next/headers";
import { verify } from "jsonwebtoken";

/**
 * GET /api/notifications/my-counts
 *
 * Returns badge counts for the authenticated user, broken down per role:
 *
 *  - assignedArticles: # of articles assigned to me (as editor OR researcher)
 *                      that still need work. For editors → pending articles
 *                      in the queue. For researchers → assigned articles
 *                      that are not yet certified.
 *  - assignedTrials:   # of trials assigned to me as a researcher that are
 *                      not yet verified.
 *  - total:            sum of the above (used for the top-level badge)
 *
 * Responses are user-specific and never cached.
 */
export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth")?.value;
  if (!token) {
    return NextResponse.json({
      success: true,
      assignedArticles: 0,
      assignedTrials: 0,
      total: 0,
    });
  }

  let payload;
  try {
    payload = verify(token, process.env.JWT_SECRET || "your-secret-key");
  } catch {
    return NextResponse.json({
      success: true,
      assignedArticles: 0,
      assignedTrials: 0,
      total: 0,
    });
  }

  const userId = payload.id;
  const isAdmin = !!payload.isAdmin;
  const role = payload.role;

  let assignedArticles = 0;
  let assignedTrials = 0;

  try {
    // Articles assigned to the user (as editor or researcher)
    // For editors, count remaining pending articles. For researchers, count
    // articles that aren't yet certified (either pending or published-but-uncert).
    if (role === "editor" || role === "researcher" || isAdmin) {
      const articleResult = await query(
        `SELECT COUNT(*)::int AS count
         FROM article_assignments aa
         LEFT JOIN pending_article pa ON pa.id = aa.article_id
         LEFT JOIN article a ON a.id = aa.article_id
         WHERE aa.editor_id = $1
           AND (
             pa.id IS NOT NULL   -- still in pending queue
             OR (a.id IS NOT NULL AND a.certifiedby IS NULL)  -- published but uncertified
           )`,
        [userId]
      );
      assignedArticles = articleResult.rows[0]?.count || 0;
    }

    // Trials assigned to the user (researcher or editor) and not yet verified
    if (role === "researcher" || role === "editor" || isAdmin) {
      try {
        const trialRows = await sql`
          SELECT COUNT(*)::int AS count
          FROM trial_assignments ta
          JOIN clinical_trials ct ON ct.nct_id = ta.nct_id
          WHERE ta.researcher_id = ${userId}
            AND ct.verified_by IS NULL
        `;
        assignedTrials = trialRows[0]?.count || 0;
      } catch (e) {
        // trial_assignments table may not exist on tenants that haven't run the
        // overhaul migration yet — silently treat as 0.
        console.warn("trial-assignments lookup skipped:", e.message);
      }
    }

    return NextResponse.json({
      success: true,
      assignedArticles,
      assignedTrials,
      total: assignedArticles + assignedTrials,
    });
  } catch (err) {
    console.error("my-counts error:", err);
    return NextResponse.json(
      { success: false, error: err.message, assignedArticles: 0, assignedTrials: 0, total: 0 },
      { status: 500 }
    );
  }
}
