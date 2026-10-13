// /app/api/articles/simplify/route.js

import { NextResponse } from "next/server";
import { simplifyArticle } from "@/utils/apiHelpers";

// Simplification takes ~16–30 s on gpt-6.1-sol (see SIMPLIFY_MODEL).
export const maxDuration = 60;

export async function POST(req) {
    try {
        const { content } = await req.json();

        // Use the utility function to simplify the article
        const simplified = await simplifyArticle(content);

        return NextResponse.json({ simplified });
    } catch (error) {
        console.error("Error calling OpenAI API:", error);
        return NextResponse.json(
            { message: "Failed to simplify article" },
            { status: 500 }
        );
    }
}
