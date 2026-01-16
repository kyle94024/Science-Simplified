// src/app/api/magic-link/verify/route.js
import { NextResponse } from "next/server";
import crypto from "crypto";
import { sql } from "@/lib/neon";
import { sign } from "jsonwebtoken";
import { serialize } from "cookie";
import { tenant as defaultTenant } from "@/lib/config";

const tenant_domain = defaultTenant.domain;

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const tenant = defaultTenant.shortName; // still correct (panel context)
    const token = searchParams.get("token");

    if (!tenant || !token) {
      return NextResponse.json(
        { error: "Missing tenant or token" },
        { status: 400 }
      );
    }

    // Hash token
    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Get magic link row
    const magicLinks = await sql`
      SELECT *
      FROM magic_links
      WHERE token_hash = ${tokenHash}
    `;

    if (magicLinks.length === 0) {
      return NextResponse.json(
        { error: "Invalid or used token" },
        { status: 400 }
      );
    }

    const magicLink = magicLinks[0];

    // Check expiration
    if (
      magicLink.expires_at &&
      new Date() > new Date(magicLink.expires_at)
    ) {
      return NextResponse.json(
        { error: "Token expired" },
        { status: 400 }
      );
    }

    // Mark token as used
    await sql`
      UPDATE magic_links
      SET used = true
      WHERE token_hash = ${tokenHash}
    `;

    // Fetch user
    const users = await sql`
      SELECT *
      FROM email_credentials
      WHERE LOWER(email) = ${magicLink.email.toLowerCase()}
    `;

    if (users.length === 0) {
      return NextResponse.json(
        { error: "No user for this email" },
        { status: 404 }
      );
    }

    const user = users[0];

    // Check admin
    const admins = await sql`
      SELECT 1
      FROM admin_users
      WHERE LOWER(email) = ${user.email.toLowerCase()}
    `;
    const isAdmin = admins.length > 0;

    // Generate JWT
    const jwt = sign(
      {
        email: user.email,
        isAdmin,
        role: user.role,
        id: user.id,
        name: `${user.first_name} ${user.last_name}`,
      },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "1d" }
    );

    // Set auth cookie
    const cookie = serialize("auth", jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 86400,
      path: "/",
    });

    // Redirect
    const domain = tenant_domain || "http://localhost:3000";
    const finalUrl = `${domain}/assigned-articles`;

    const response = NextResponse.redirect(finalUrl);
    response.headers.set("Set-Cookie", cookie);
    return response;

  } catch (err) {
    console.error("VERIFY ERROR:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}