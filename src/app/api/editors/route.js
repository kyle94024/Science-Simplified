// app/api/editors/route.js
//
// Returns all users who can be assigned articles for review:
//   1. Anyone in email_credentials with role='editor'
//   2. Anyone whose email is in admin_users (admins can also be assigned)
//
// Each row carries an `is_admin` flag so the assign-articles UI can
// distinguish between editors and admin assignees.

export const revalidate = 0;

import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const result = await query(
            `
            SELECT
                ec.id,
                ec.email,
                p.name,
                p.photo,
                p.title,
                p.degree,
                p.university,
                (au.email IS NOT NULL) AS is_admin
            FROM email_credentials ec
            LEFT JOIN profile p ON ec.id = p.user_id
            LEFT JOIN admin_users au ON LOWER(au.email) = LOWER(ec.email)
            WHERE ec.role = 'editor' OR au.email IS NOT NULL
            ORDER BY (au.email IS NOT NULL) DESC, p.name ASC, ec.email ASC
            `
        );

        return NextResponse.json(result.rows);
    } catch (error) {
        console.error("Error fetching editors:", error);
        return NextResponse.json(
            { message: "Error fetching editors" },
            { status: 500 }
        );
    }
}
