import { query } from "@/lib/db";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { sendResetPasswordEmail } from "@/lib/email";

export async function POST(req) {
    try {
        const { email } = await req.json();

        const userRes = await query(
            "SELECT * FROM email_credentials WHERE email = $1",
            [email]
        );

        if (userRes.rows.length === 0) {
            return NextResponse.json(
                { message: "User not found" },
                { status: 404 }
            );
        }

        const token = crypto.randomBytes(32).toString("hex");
        const expires = new Date(Date.now() + 1000 * 60 * 30);

        await query(
            "UPDATE email_credentials SET reset_token=$1, reset_token_expiry=$2 WHERE email=$3",
            [token, expires, email]
        );

        const resetLink = `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password?token=${token}`;

        //  SEND EMAIL
        await sendResetPasswordEmail({ email, resetLink });

        return NextResponse.json({
            message: "Reset link sent. Check your email.",
        });

    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { message: "Something went wrong" },
            { status: 500 }
        );
    }
}