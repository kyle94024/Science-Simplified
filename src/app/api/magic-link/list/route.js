import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { tenant } from "@/lib/config";
import { requireAdmin } from "@/lib/adminGuard";

export async function GET(req) {
  const adminCheck = requireAdmin(req);
  if (adminCheck instanceof NextResponse) return adminCheck;

  const tenant_domain = tenant.domain;

  try {
    const allLinks = [];
    const key = tenant.shortName;

    const result = await sql`
      SELECT id, email, token_hash, redirect_url, created_at, used
      FROM magic_links
      ORDER BY created_at DESC
    `;

    result.forEach((row) => {
      allLinks.push({
        ...row,
        tenant: key,
        url: `${tenant_domain}/api/magic-link/verify?token=__TOKEN__`,
      });
    });

    return NextResponse.json({ links: allLinks });
  } catch (error) {
    console.error("Error listing magic links:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}