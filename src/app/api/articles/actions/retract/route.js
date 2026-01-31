import { query } from "@/lib/db";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";


// Only allow POST method
export async function POST(req) {
    const adminCheck = requireAdmin(req);
    if (adminCheck instanceof NextResponse) return adminCheck;
    
    const { id } = await req.json(); // Parse JSON body from the request

    try {
        // Step 1: Retrieve the article, including image_url
        const result = await query("SELECT * FROM article WHERE id = $1", [id]);
        const article = result.rows[0];

        // Check if article exists
        if (!article) {
            return NextResponse.json(
                { success: false, message: "Article not found" },
                { status: 404 }
            );
        }

        // Step 2: Insert article into pending_article table, including the image_url field
        await query(
            "INSERT INTO pending_article (title, tags, innertext, summary, article_link, publisher, image_url, authors, publication_date, source_publication, image_credit, additional_editors) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)",
            [
                article.title,
                article.tags,
                article.innertext,
                article.summary,
                article.article_link,
                article.publisher,
                article.image_url,
                article.authors,
                article.publication_date,
                article.source_publication,
                article.image_credit,
                article.additional_editors,
            ]
        );

        // Step 3: Delete the article from the article table
        await query("DELETE FROM article WHERE id = $1", [id]);

        return NextResponse.json({
            success: true,
            message: "Article retracted successfully!",
        });
    } catch (error) {
        console.error("Error retracting article:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}
