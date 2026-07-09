export const revalidate = 0;

import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireStrictAdmin } from "@/lib/adminGuard";

/**
 * GET /api/admin/accounts — everyone an admin can manage: editors, experts
 * (role='researcher'), and admins, with their full profile fields for the
 * account editor. Admin-ONLY (editors are not admitted).
 *
 * There is deliberately no DELETE anywhere under /api/admin/accounts —
 * accounts cannot be deleted from this surface.
 */
export async function GET(req) {
    const auth = requireStrictAdmin(req);
    if (auth instanceof NextResponse) return auth;

    try {
        const result = await query(
            `SELECT ec.id,
                    ec.email,
                    ec.role,
                    ec.first_name,
                    ec.last_name,
                    (au.email IS NOT NULL) AS is_admin,
                    p.name,
                    p.photo,
                    p.degree,
                    p.title,
                    p.university,
                    p.bio,
                    p.linkedin,
                    p.lablink,
                    (p.user_id IS NOT NULL) AS has_profile
             FROM email_credentials ec
             LEFT JOIN profile p ON p.user_id = ec.id
             LEFT JOIN admin_users au ON LOWER(au.email) = LOWER(ec.email)
             WHERE ec.role IN ('editor', 'researcher') OR au.email IS NOT NULL
             ORDER BY (au.email IS NOT NULL) DESC, LOWER(COALESCE(p.name, ec.email)) ASC`
        );

        return NextResponse.json({ success: true, accounts: result.rows });
    } catch (err) {
        console.error("admin accounts list error:", err);
        return NextResponse.json(
            { success: false, error: err.message },
            { status: 500 }
        );
    }
}
