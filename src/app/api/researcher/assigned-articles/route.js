export const revalidate = 0;

import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { cookies } from "next/headers";
import { verify } from "jsonwebtoken";

/**
 * GET: list articles assigned to the authenticated researcher/expert.
 * Returns BOTH pending articles (still in review queue) and published articles
 * (already moved to `article` table). For published, we check `certifiedby` to
 * mark them as already certified vs awaiting certification.
 */
export async function GET(req) {
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
    const result = await query(
      `SELECT aa.article_id,
              COALESCE(pa.title, a.title) AS title,
              COALESCE(pa.summary, a.summary) AS summary,
              COALESCE(pa.image_url, a.image_url) AS image_url,
              CASE WHEN a.id IS NOT NULL THEN true ELSE false END AS is_published,
              (a.certifiedby IS NOT NULL) AS is_certified
       FROM article_assignments aa
       LEFT JOIN pending_article pa ON pa.id = aa.article_id
       LEFT JOIN article a ON a.id = aa.article_id
       WHERE aa.editor_id = $1
       ORDER BY aa.article_id DESC`,
      [payload.id]
    );

    return NextResponse.json({
      success: true,
      articles: result.rows,
    });
  } catch (err) {
    console.error("Researcher assigned-articles error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
