export const revalidate = 0;

import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get("search");
        const sort = searchParams.get("sort");

        let whereClause = "";
        let values = [];

        if (search) {
            whereClause = `
                WHERE 
                    LOWER(a.title) LIKE LOWER($1)
                    OR LOWER(a.summary) LIKE LOWER($1)
                    OR LOWER(a.innertext) LIKE LOWER($1)
                    OR EXISTS (
                        SELECT 1 FROM unnest(a.authors) author
                        WHERE LOWER(author) LIKE LOWER($1)
                    )
            `;
            values.push(`%${search}%`);
        }

        let orderClause = "ORDER BY a.id DESC";

        if (sort === "publication") {
            orderClause = `
                ORDER BY 
                NULLIF(a.publication_date, '')::date DESC NULLS LAST
            `;
        }

        const result = await query(
            `
            SELECT
              a.*,
              p.photo,
              p.name,
              p.degree,
              p.university
            FROM article a
            LEFT JOIN profile p
              ON (a.certifiedby->>'userId')::INT = p.user_id
            ${whereClause}
            ${orderClause}
            `,
            values
        );

        return NextResponse.json(result.rows);

    } catch (error) {
        console.error("Error executing query", error);

        return NextResponse.json(
            { message: "Error executing query" },
            { status: 500 }
        );
    }
}