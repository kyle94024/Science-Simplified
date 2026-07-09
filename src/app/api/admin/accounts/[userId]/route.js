export const revalidate = 0;

import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireStrictAdmin } from "@/lib/adminGuard";
import bcrypt from "bcryptjs";

/**
 * Admin account editor endpoints. Admin-ONLY (requireStrictAdmin — editors
 * are not admitted).
 *
 * PATCH — partial profile update. ONLY whitelisted profile fields, and ONLY
 * the ones actually present in the body, are written; everything else on the
 * row is untouched (this is deliberately NOT a full-row overwrite, so a save
 * can never null out fields it didn't send — email/role/admin status are not
 * editable here at all).
 *
 * POST — set a new password for the user (bcrypt, same shape as signup).
 *
 * There is intentionally NO DELETE handler — accounts cannot be deleted
 * from this surface (a DELETE request 405s).
 */

// Profile columns an admin may edit. Keys = accepted body fields.
const EDITABLE_FIELDS = [
    "name",
    "degree",
    "title",
    "university",
    "bio",
    "linkedin",
    "lablink",
    "photo",
];

async function loadAccount(userId) {
    const result = await query(
        `SELECT ec.id,
                ec.email,
                ec.role,
                (au.email IS NOT NULL) AS is_admin,
                p.user_id AS profile_user_id,
                p.name, p.photo, p.degree, p.title, p.university,
                p.bio, p.linkedin, p.lablink
         FROM email_credentials ec
         LEFT JOIN profile p ON p.user_id = ec.id
         LEFT JOIN admin_users au ON LOWER(au.email) = LOWER(ec.email)
         WHERE ec.id = $1`,
        [userId]
    );
    return result.rows[0] || null;
}

export async function GET(req, { params }) {
    const auth = requireStrictAdmin(req);
    if (auth instanceof NextResponse) return auth;

    const { userId: userIdParam } = await params;
    const userId = parseInt(userIdParam, 10);
    if (!Number.isInteger(userId)) {
        return NextResponse.json({ success: false, error: "Invalid user id" }, { status: 400 });
    }

    const account = await loadAccount(userId);
    if (!account) {
        return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, account });
}

export async function PATCH(req, { params }) {
    const auth = requireStrictAdmin(req);
    if (auth instanceof NextResponse) return auth;

    const { userId: userIdParam } = await params;
    const userId = parseInt(userIdParam, 10);
    if (!Number.isInteger(userId)) {
        return NextResponse.json({ success: false, error: "Invalid user id" }, { status: 400 });
    }

    try {
        const body = await req.json();

        // Take only whitelisted fields that are actually present in the body.
        const updates = {};
        for (const field of EDITABLE_FIELDS) {
            if (Object.prototype.hasOwnProperty.call(body, field)) {
                const v = body[field];
                // Normalize: strings are trimmed; empty string clears a field
                // (stored as NULL); anything else is rejected.
                if (v === null || typeof v === "string") {
                    updates[field] = typeof v === "string" && v.trim() === "" ? null : typeof v === "string" ? v.trim() : null;
                } else {
                    return NextResponse.json(
                        { success: false, error: `Field "${field}" must be a string` },
                        { status: 400 }
                    );
                }
            }
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json(
                { success: false, error: "No editable fields provided" },
                { status: 400 }
            );
        }

        const account = await loadAccount(userId);
        if (!account) {
            return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
        }

        if (account.profile_user_id == null) {
            // No profile row yet — create one carrying ONLY the provided
            // fields (plus identity columns).
            const cols = ["user_id", "email", ...Object.keys(updates)];
            const vals = [userId, account.email, ...Object.values(updates)];
            const placeholders = vals.map((_, i) => `$${i + 1}`).join(", ");
            await query(
                `INSERT INTO profile (${cols.join(", ")}) VALUES (${placeholders})`,
                vals
            );
        } else {
            // Dynamic SET over just the provided fields — nothing else moves.
            const keys = Object.keys(updates);
            const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
            await query(
                `UPDATE profile SET ${setClause} WHERE user_id = $${keys.length + 1}`,
                [...Object.values(updates), userId]
            );
        }

        const updated = await loadAccount(userId);
        return NextResponse.json({ success: true, account: updated });
    } catch (err) {
        console.error("admin account PATCH error:", err);
        return NextResponse.json(
            { success: false, error: err.message },
            { status: 500 }
        );
    }
}

export async function POST(req, { params }) {
    const auth = requireStrictAdmin(req);
    if (auth instanceof NextResponse) return auth;

    const { userId: userIdParam } = await params;
    const userId = parseInt(userIdParam, 10);
    if (!Number.isInteger(userId)) {
        return NextResponse.json({ success: false, error: "Invalid user id" }, { status: 400 });
    }

    try {
        const { newPassword } = await req.json();
        if (typeof newPassword !== "string" || newPassword.length < 8) {
            return NextResponse.json(
                { success: false, error: "Password must be at least 8 characters" },
                { status: 400 }
            );
        }

        const target = await query(
            `SELECT id FROM email_credentials WHERE id = $1`,
            [userId]
        );
        if (target.rows.length === 0) {
            return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);
        await query(
            `UPDATE email_credentials SET password_hash = $1 WHERE id = $2`,
            [passwordHash, userId]
        );

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("admin account password error:", err);
        return NextResponse.json(
            { success: false, error: err.message },
            { status: 500 }
        );
    }
}
