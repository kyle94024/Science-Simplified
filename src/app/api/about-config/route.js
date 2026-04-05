import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { requireAdmin } from "@/lib/adminGuard";
import { buildDefaultSections } from "@/lib/about-config";
import { tenant } from "@/lib/config";

export async function GET() {
  try {
    const rows = await sql`
      SELECT sections, updated_at, updated_by
      FROM about_page_config
      LIMIT 1
    `;

    if (rows.length > 0 && rows[0].sections?.length > 0) {
      return NextResponse.json({
        sections: rows[0].sections,
        updatedAt: rows[0].updated_at,
        updatedBy: rows[0].updated_by,
        source: "db",
      });
    }

    // Return defaults inline so no separate auth-gated fetch is needed
    const defaults = buildDefaultSections(tenant);
    return NextResponse.json({ sections: defaults, source: "defaults" });
  } catch (error) {
    console.error("Error fetching about config:", error);
    return NextResponse.json(
      { error: "Failed to fetch about page config" },
      { status: 500 }
    );
  }
}

export async function PUT(req) {
  const authResult = requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { sections } = await req.json();

    if (!Array.isArray(sections)) {
      return NextResponse.json(
        { error: "sections must be an array" },
        { status: 400 }
      );
    }

    const updatedBy = authResult.name || authResult.email || "admin";

    // Upsert: insert if no row exists, update if one does
    const rows = await sql`
      SELECT id FROM about_page_config LIMIT 1
    `;

    if (rows.length > 0) {
      await sql`
        UPDATE about_page_config
        SET sections = ${JSON.stringify(sections)}::jsonb,
            updated_at = NOW(),
            updated_by = ${updatedBy}
        WHERE id = ${rows[0].id}
      `;
    } else {
      await sql`
        INSERT INTO about_page_config (sections, updated_by)
        VALUES (${JSON.stringify(sections)}::jsonb, ${updatedBy})
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving about config:", error);
    return NextResponse.json(
      { error: "Failed to save about page config" },
      { status: 500 }
    );
  }
}
