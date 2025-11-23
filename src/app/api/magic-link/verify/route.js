// src/app/api/magic-link/verify/route.js
import { NextResponse } from "next/server";
import crypto from "crypto";
import { tenantQuery } from "@/lib/tenantDb";
import { sign } from "jsonwebtoken";
import { serialize } from "cookie";
import { tenant as defaultTenant } from "@/lib/config";
import { requireAdmin } from "@/lib/adminGuard";



// Tenant → Domain mapping (final)
// const TENANT_DOMAINS = {
//   NF: "https://nfsimplified.com",
//   EB: "https://sseb.vercel.app",
//   Vitiligo: "https://ssvitiligo.vercel.app",
//   CF: "https://sscf-coral.vercel.app",
//   ALS: "https://ssals-ten.vercel.app",
//   HS: "https://science-simplified-mu.vercel.app/",
//   Ashermans: "https://ssashermans.vercel.app",
//   RYR1: "https://ssryr1.vercel.app",
//   Aicardi: "https://ssaicardi.vercel.app",
//   Progeria: "https://ssprogeria.vercel.app",
//   RETT: "https://ssrett.vercel.app",
//   Canavan: "https://sscanavan.vercel.app",
//   HUNTINGTONS: "https://sshuntingtons.vercel.app", 
// };
const tenant_domain = defaultTenant.domain;

export async function GET(req) {
  const adminCheck = requireAdmin();
  if (adminCheck instanceof NextResponse) return adminCheck;

  try {
    const { searchParams } = new URL(req.url);
    const tenant = searchParams.get("tenant");
    const token = searchParams.get("token");

    if (!tenant || !token) {
      return NextResponse.json({ error: "Missing tenant or token" }, { status: 400 });
    }

    // Hash token
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // Get magic link row
    const sql = `
      SELECT * 
      FROM magic_links 
      WHERE token_hash = $1 AND used = false
    `;
    const { rows } = await tenantQuery(tenant, sql, [tokenHash]);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Invalid or used token" }, { status: 400 });
    }

    const magicLink = rows[0];

    // Check expiration
    if (magicLink.expires_at && new Date() > new Date(magicLink.expires_at)) {
      return NextResponse.json({ error: "Token expired" }, { status: 400 });
    }

    // Mark token as used
    await tenantQuery(tenant, `UPDATE magic_links SET used = true WHERE token_hash = $1`, [tokenHash]);

     // ---------------------- 🔥 NEW: Fetch full user details ----------------------
     const userResult = await tenantQuery(
      tenant,
      `SELECT * FROM email_credentials WHERE LOWER(email) = $1`,
      [magicLink.email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: "No user for this email" }, { status: 404 });
    }

    const user = userResult.rows[0];

    // Check if admin
    const adminResult = await tenantQuery(
      tenant,
      "SELECT * FROM admin_users WHERE LOWER(email) = $1",
      [user.email.toLowerCase()]
    );
    const isAdmin = adminResult.rows.length > 0;

    // Generate JWT (same as login)
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

    // Set auth cookie (same)
    const cookie = serialize("auth", jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 86400,
      path: "/",
    });

    // Redirect to frontend
    const domain = tenant_domain || "http://localhost:3000";
    const finalUrl = `${domain}/assigned-articles`;

    const response = NextResponse.redirect(finalUrl);
    response.headers.set("Set-Cookie", cookie);
    return response;

  } catch (err) {
    console.error("VERIFY ERROR:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
