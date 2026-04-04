import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { buildDefaultSections } from "@/lib/about-config";
import { tenant } from "@/lib/config";

export async function GET(req) {
  const authResult = requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const sections = buildDefaultSections(tenant);
    return NextResponse.json({ sections, source: "defaults" });
  } catch (error) {
    console.error("Error building default sections:", error);
    return NextResponse.json(
      { error: "Failed to build default sections" },
      { status: 500 }
    );
  }
}
