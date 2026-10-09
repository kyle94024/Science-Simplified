// src/app/api/images/generate/route.js
import { NextResponse } from "next/server";
import fetch from "node-fetch"; // or global fetch in newer runtimes
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper to upload base64 buffer to Cloudinary
async function uploadBufferToCloudinary(base64, publicId) {
  // base64 should be like "data:image/png;base64,AAAA..."
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      base64,
      {
        resource_type: "image",
        public_id: publicId,
        folder: "ai_generated",
        overwrite: true,
        quality: "auto:good",
      },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
  });
}

export async function POST(req) {
  try {
    const { text, articleId } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
    }

    // Build prompt — keep it clear, instruct "no text"
    const prompt = `${text}\n\nCreate a clean scientific illustration (no text on the image) that visually represents the simplified article above. Minimalistic, clear, high-quality, suitable as a magazine-style cover image.`;

    // Call OpenAI Images (gpt-image-1.5; gpt-image-1 was retired 2026-10-23) - returns base64
    const openaiResp = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-image-1.5",
        prompt,
        size: "1536x1024",   // <- change here (supported)
        // you may set other options the API supports
      }),
    });

    const openaiData = await openaiResp.json();

    if (!openaiResp.ok) {
      console.error("OpenAI image error:", openaiData);
      return NextResponse.json({ error: "Image generation failed", detail: openaiData }, { status: 500 });
    }

    // Expecting base64 in openaiData.data[0].b64_json or similar depending on API
    const b64 = openaiData?.data?.[0]?.b64_json;
    if (!b64) {
      console.error("No base64 returned:", openaiData);
      return NextResponse.json({ error: "No image returned from OpenAI" }, { status: 500 });
    }

    const dataUrl = `data:image/png;base64,${b64}`;

    // Upload to Cloudinary
    const publicId = articleId ? `article_${articleId}_ai` : `article_ai_${Date.now()}`;
    const uploadResult = await uploadBufferToCloudinary(dataUrl, publicId);

    return NextResponse.json({ url: uploadResult.secure_url, public_id: uploadResult.public_id });

  } catch (err) {
    console.error("generate image error:", err);
    return NextResponse.json({ error: "Server error", details: String(err) }, { status: 500 });
  }
}