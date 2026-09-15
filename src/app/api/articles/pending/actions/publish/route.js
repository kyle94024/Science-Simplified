import { query } from "@/lib/db";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { generateArticleAudio } from "@/lib/tts";
import { sanitizeRichText } from "@/lib/richText";


// Only allow POST method
export async function POST(req) {
    const adminCheck = requireAdmin(req);
    if (adminCheck instanceof NextResponse) return adminCheck;
    
    const { id, certifiedby } = await req.json(); // Parse JSON body from the request

    try {
        // Fetch the article from the pending_article table, including image_url
        const result = await query(
            "SELECT * FROM pending_article WHERE id = $1",
            [id]
        );
        const article = result.rows[0];

        // Check if the article exists
        if (!article) {
            return NextResponse.json(
                { success: false, message: "Article not found" },
                { status: 404 }
            );
        }

        // The AI pipeline writes pending rows unsanitized, so the move from
        // pending_article to article is the chokepoint for published rich text.
        const innertext = sanitizeRichText(article.innertext);
        const summary = sanitizeRichText(article.summary);

        // Insert the article into the article table, including the certifiedby, image_url, and publication_date fields
        // Insert the article into the article table, now including authors
        const insertResult = await query(
            `INSERT INTO article
            (title, tags, innertext, summary, article_link, publisher, authors, certifiedby, image_url, publication_date, source_publication, image_credit, additional_editors)
            VALUES ($1, $2, $3, $4, $5, $6, $7::text[], $8::jsonb, $9, $10, $11, $12, $13)
            RETURNING id`,
            [
                article.title,
                article.tags,
                innertext,
                summary,
                article.article_link,
                article.publisher,
                article.authors ?? [],
                JSON.stringify(certifiedby),
                article.image_url,
                article.publication_date,
                article.source_publication,
                article.image_credit,
                article.additional_editors ?? [],
            ]
        );
        

        const newArticleId = insertResult.rows[0].id;

        // Delete the article from the pending_article table
        await query("DELETE FROM pending_article WHERE id = $1", [id]);

        // Fire-and-forget TTS generation (don't block publish response)
        generateArticleAudio(newArticleId, article.title, innertext)
            .then(() => console.log(`TTS generated for article ${newArticleId}`))
            .catch((err) => console.error(`TTS failed for article ${newArticleId}:`, err));

        return NextResponse.json({
            success: true,
            message: "Article published successfully!",
        });
    } catch (error) {
        console.error("Error publishing article:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}
