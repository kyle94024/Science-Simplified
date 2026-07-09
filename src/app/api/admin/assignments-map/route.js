export const revalidate = 0;

import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireStrictAdmin } from "@/lib/adminGuard";

/**
 * GET /api/admin/assignments-map
 *
 * Data for the admin assignment bubble map: every editor / expert / admin
 * who currently has at least one article assignment, with their assigned
 * articles. People with zero assignments are omitted by construction
 * (INNER JOIN on article_assignments).
 *
 * STRICTLY admin-only (requireAdmin would also admit editors — the map and
 * the account editor it links to are admin tools).
 */

export async function GET(req) {
    const auth = requireStrictAdmin(req);
    if (auth instanceof NextResponse) return auth;

    try {
        const result = await query(
            `SELECT aa.editor_id,
                    aa.article_id,
                    ec.email,
                    ec.role,
                    (au.email IS NOT NULL) AS is_admin,
                    COALESCE(p.name, TRIM(CONCAT(ec.first_name, ' ', ec.last_name)), ec.email) AS name,
                    p.photo,
                    p.degree,
                    p.title AS person_title,
                    COALESCE(pa.title, a.title) AS article_title,
                    (a.id IS NOT NULL) AS is_published,
                    (a.certifiedby IS NOT NULL) AS is_certified
             FROM article_assignments aa
             JOIN email_credentials ec ON ec.id = aa.editor_id
             LEFT JOIN profile p ON p.user_id = ec.id
             LEFT JOIN admin_users au ON LOWER(au.email) = LOWER(ec.email)
             LEFT JOIN pending_article pa ON pa.id = aa.article_id
             LEFT JOIN article a ON a.id = aa.article_id
             ORDER BY ec.id, aa.article_id DESC`
        );

        // Group rows into people → assignments. Rows whose article no longer
        // exists in either table (title NULL) are stale assignment rows —
        // surface them so the admin can clean them up via the map.
        const byPerson = new Map();
        for (const row of result.rows) {
            if (!byPerson.has(row.editor_id)) {
                byPerson.set(row.editor_id, {
                    id: row.editor_id,
                    name: row.name || row.email,
                    email: row.email,
                    photo: row.photo || null,
                    degree: row.degree || null,
                    title: row.person_title || null,
                    role: row.is_admin ? "admin" : row.role === "researcher" ? "expert" : "editor",
                    articles: [],
                });
            }
            byPerson.get(row.editor_id).articles.push({
                id: row.article_id,
                title: row.article_title || `(missing article #${row.article_id})`,
                isPublished: row.is_published,
                isCertified: row.is_certified,
                isMissing: row.article_title == null,
            });
        }

        return NextResponse.json({ success: true, people: [...byPerson.values()] });
    } catch (err) {
        console.error("assignments-map error:", err);
        return NextResponse.json(
            { success: false, error: err.message },
            { status: 500 }
        );
    }
}
