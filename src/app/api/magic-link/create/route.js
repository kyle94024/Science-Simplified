// src/app/api/magic-link/create/route.js
import crypto from "crypto";
import { NextResponse } from "next/server";
import { tenantQuery, getTenantPool } from "@/lib/tenantDb";
import { sendMagicLinkEmail } from "@/lib/email";
import { tenant as defaultTenant } from "@/lib/config";
import { requireAdmin } from "@/lib/adminGuard";

// Tenant → Domain Map (final)
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

export async function POST(req) {
  const adminCheck = requireAdmin();
  if (adminCheck instanceof NextResponse) return adminCheck;

  try {
    const body = await req.json();

    const tenant = (body?.tenant || "NF").toString();
    const email = (body?.email || "").toLowerCase();

    if (!tenant || !email) {
      return NextResponse.json({ error: "Missing tenant or email" }, { status: 400 });
    }

    // Load tenant env
    getTenantPool(tenant);

    const redirectUrl = "/assigned-articles";

    // Generate raw + hashed token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    // 30 days from now
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Store into tenant DB with expiration
    const insertSQL = `
      INSERT INTO magic_links (email, token_hash, redirect_url, expires_at)
      VALUES ($1, $2, $3, $4)
      RETURNING id, created_at
    `;

    const result = await tenantQuery(tenant, insertSQL, [
      email,
      tokenHash,
      redirectUrl,
      expiresAt,
    ]);

    // Construct verify URL
    const apiBase = tenant_domain?.replace(/\/$/, "") || "http://localhost:3000";
    const magicUrl = `${apiBase}/api/magic-link/verify?tenant=${tenant}&token=${rawToken}`;

    console.log("Magic URL:", magicUrl);

    // // Send email
    // try {
    //   await sendMagicLinkEmail({
    //     tenant,
    //     email,
    //     url: magicUrl,
    //   });
    //   console.log("Magic link sent:", email);
    // } catch (err) {
    //   console.error("Email sending failed:", err);
    // }

    return NextResponse.json({
      success: true,
      id: result.rows[0].id,
      created_at: result.rows[0].created_at,
    });

  } catch (err) {
    console.error("MAGIC CREATE ERROR:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
