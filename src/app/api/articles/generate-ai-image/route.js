import { NextResponse } from "next/server";
import OpenAI from "openai";
import { v2 as cloudinary } from "cloudinary";

// Init OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req) {
    try {
        const { articleId, simplifiedText } = await req.json();

        if (!articleId || !simplifiedText) {
            return NextResponse.json(
                { success: false, message: "Missing articleId or simplifiedText" },
                { status: 400 }
            );
        }

        // ------------------------------
        // 1️⃣ Generate AI IMAGE (gpt-image-1.5; gpt-image-1 was retired 2026-10-23)
        // ------------------------------
        const prompt = `
Create a clean, high-quality scientific illustration based on the following text:

"${simplifiedText}"

IMPORTANT:
- Do NOT include text in the image.
- Style should match NF Simplified's existing illustration style.
- The image should be informative, modern, and visually clean.
- Medium-quality tier.
`;

        const aiImage = await openai.images.generate({
            model: "gpt-image-1.5",
            prompt,
            size: "1536x1024", // landscape; the gpt-image family has no 1792x1024
            quality: "high",
            // (no response_format: gpt-image models always return b64_json)
        });

        const base64Image = aiImage.data[0].b64_json;

        // Convert base64 → buffer
        const buffer = Buffer.from(base64Image, "base64");

        // ------------------------------
        // 2️⃣ Upload to Cloudinary
        // ------------------------------
        const uploadResult = await cloudinary.uploader.upload(
            `data:image/png;base64,${base64Image}`,
            {
                folder: "article-images",
                use_filename: true,
                unique_filename: true,
            }
        );

        const cloudinaryUrl = uploadResult.secure_url;

        // ------------------------------
        // 3️⃣ Update article in DB (PATCH)
        // ------------------------------
        const patchResult = await fetch(
            `${process.env.APIHOSTNAME}/api/articles/${articleId}`,
            {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ imageUrl: cloudinaryUrl }),
            }
        );

        const updatedArticle = await patchResult.json();

        // ------------------------------
        // 4️⃣ Return Response
        // ------------------------------
        return NextResponse.json({
            success: true,
            imageUrl: cloudinaryUrl,
            article: updatedArticle.article,
        });

    } catch (err) {
        console.error("AI IMAGE GENERATION ERROR:", err);
        return NextResponse.json(
            { success: false, message: "Failed to generate AI image" },
            { status: 500 }
        );
    }
}