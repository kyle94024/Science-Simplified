import { query } from "@/lib/db";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { token, newPassword } = await req.json();

    const userRes = await query(
      "SELECT * FROM email_credentials WHERE reset_token = $1",
      [token]
    );

    if (userRes.rows.length === 0) {
      return NextResponse.json(
        { message: "Invalid token" },
        { status: 400 }
      );
    }

    const user = userRes.rows[0];

    if (new Date(user.reset_token_expiry) < new Date()) {
      return NextResponse.json(
        { message: "Token expired" },
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

    return NextResponse.json({ message: "Password updated" });

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    );
  }
}