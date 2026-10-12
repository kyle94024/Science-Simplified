export const revalidate = 0;

import { query } from "@/lib/db";
import { NextResponse } from "next/server";
import { SUPPORTED_LANGUAGES } from "@/lib/translationWarnings";

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get("search");
        const sort = searchParams.get("sort");
        // When a reader browses in another language, search its translations too.
        const lang = searchParams.get("lang");
        const searchLang = SUPPORTED_LANGUAGES.some((l) => l.code === lang) ? lang : null;

        let whereClause = "";
        let values = [];

        if (search) {
            values.push(`%${search}%`);
            let translationMatch = "";
            if (searchLang) {
                values.push(searchLang);
                translationMatch = `
                    OR EXISTS (
                        SELECT 1 FROM article_translations tr
                        WHERE tr.article_id = a.id AND tr.language = $2 AND tr.source_hash IS NOT NULL
                          AND (LOWER(tr.translated_title) LIKE LOWER($1)
                               OR LOWER(tr.translated_summary) LIKE LOWER($1)
                               OR LOWER(tr.translated_innertext) LIKE LOWER($1))
                    )`;
            }
            whereClause = `
                WHERE 
                    LOWER(a.title) LIKE LOWER($1)
                    OR LOWER(a.summary) LIKE LOWER($1)
                    OR LOWER(a.innertext) LIKE LOWER($1)
                    OR EXISTS (
                        SELECT 1 FROM unnest(a.authors) author
                        WHERE LOWER(author) LIKE LOWER($1)
                    )${translationMatch}
            `;
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