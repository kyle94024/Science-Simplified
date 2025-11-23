import { NextResponse } from "next/server";
import { tenantQuery } from "@/lib/tenantDb";
import { requireAdmin } from "@/lib/adminGuard";

export async function DELETE(req) {
    const adminCheck = requireAdmin();
    if (adminCheck instanceof NextResponse) return adminCheck;

    try {
        const url = new URL(req.url);
        const id = url.searchParams.get("id");
        const tenant = url.searchParams.get("tenant");

        if (!id || !tenant) {
            return NextResponse.json(
                { error: "Missing id or tenant" },
                { status: 400 }
            );
        }

        await tenantQuery(
            tenant,
            "DELETE FROM magic_links WHERE id = $1",
            [id]
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete magic link error:", error);
        return NextResponse.json(
            { error: "Server error" },
            { status: 500 }
        );
    }
}
