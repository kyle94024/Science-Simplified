import { query } from "@/lib/db";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(req) {
    try {
        const body = await req.json();

        // =====================================
        // 🔹 RESET PASSWORD (via token)
        // =====================================
        if (body.token && body.newPassword) {
            const { token, newPassword } = body;

            const userResult = await query(
                "SELECT * FROM email_credentials WHERE reset_token = $1",
                [token]
            );

            if (userResult.rows.length === 0) {
                return NextResponse.json(
                    { message: "Invalid or expired token" },
                    { status: 400 }
                );
            }

            const user = userResult.rows[0];

            // Check if token expired
            if (!user.reset_token_expiry || new Date(user.reset_token_expiry) < new Date()) {
                return NextResponse.json(
                    { message: "Token has expired" },
                    { status: 400 }
                );
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);

            await query(
                `UPDATE email_credentials
                 SET password_hash = $1,
                     reset_token = NULL,
                     reset_token_expiry = NULL
                 WHERE email = $2`,
                [hashedPassword, user.email]
            );

            return NextResponse.json({
                message: "Password reset successful",
            });
        }

        // =====================================
        // 🔹 NORMAL PASSWORD CHANGE (logged-in user)
        // =====================================
        const { currentPassword, newPassword, email } = body;

        const userResult = await query(
            "SELECT * FROM email_credentials WHERE email = $1",
            [email]
        );

        if (userResult.rows.length === 0) {
            return NextResponse.json(
                { message: "User not found" },
                { status: 404 }
            );
        }

        const user = userResult.rows[0];

        const passwordMatch = await bcrypt.compare(
            currentPassword,
            user.password_hash
        );

        if (!passwordMatch) {
            return NextResponse.json(
                { message: "Current password is incorrect" },
                { status: 401 }
            );
        }

        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        await query(
            "UPDATE email_credentials SET password_hash = $1 WHERE email = $2",
            [newPasswordHash, email]
        );

        return NextResponse.json({
            message: "Password updated successfully",
        });

    } catch (error) {
        console.error("Update password error:", error);
        return NextResponse.json(
            { message: "Error updating password" },
            { status: 500 }
        );
    }
}