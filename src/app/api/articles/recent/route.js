export const revalidate = 0;

import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const sql = `
      SELECT
        a.*,
        p.photo      AS author_image_url,
        p.name       AS author_name,
        p.degree     AS author_degree,
        p.university AS author_university
      FROM article a
      LEFT JOIN profile p
        ON COALESCE(
             (a.certifiedby->0->>'userId'),   -- array case
             (a.certifiedby->>'userId')       -- object case
           )::INT = p.user_id
      ORDER BY a.id DESC
      LIMIT 6;
    `;

    const { rows } = await query(sql);
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching recent articles:", error);
    return NextResponse.json(
      { message: "Error fetching recent articles" },
      { status: 500 }
    );
  }
}
