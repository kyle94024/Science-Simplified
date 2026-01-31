import { query } from "@/lib/db";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";

// Only allow POST method
export async function POST(req) {
    const adminCheck = requireAdmin(req);
    if (adminCheck instanceof NextResponse) return adminCheck;
    
    const { id, title, tags, innertext, summary, article_link, image_url, authors, publication_date, source_publication, image_credit, additional_editors } =
    await req.json();

    try {
        // Execute the update query, including image_url
        await query(
            "UPDATE article SET title = $1, tags = $2, innertext = $3, summary = $4, article_link = $5, image_url = $6, authors = $7, publication_date = $8, source_publication = $9, image_credit = $10, additional_editors = $11 WHERE id = $12",
            [title, tags, innertext, summary, article_link, image_url, authors, publication_date, source_publication || null, image_credit || null, additional_editors || [], id]
        );

        return NextResponse.json({
            success: true,
            message: "Article updated successfully!",
        });
    } catch (error) {
        console.error("Error updating article:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}
