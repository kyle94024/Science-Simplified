import { NextResponse } from "next/server";

const TENANTS = ["NF", "EB", "HS"]; // List of tenants to sync

export async function GET(req) {
  const authHeader = req.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    `https://${req.headers.get("host")}`;

  const results = [];

  for (const tenant of TENANTS) {
    try {
      const res = await fetch(
        `${baseUrl}/api/clinical-trials/sync/${tenant}`,
        { cache: "no-store" }
      );

      const data = await res.json();

      results.push({
        tenant,
        success: res.ok,
        response: data,
      });
    } catch (err) {
      results.push({
        tenant,
        success: false,
        error: String(err),
      });
    }
  }

  return NextResponse.json({
    success: true,
    ranAt: new Date().toISOString(),
    results,
  });
}