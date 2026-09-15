import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";
import { Readable } from "stream";
import { requireAdmin } from "@/lib/adminGuard";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Define the POST route for uploading images
export async function POST(req) {
    // Admins and editors only — this is the path every editor image takes
    // (picked, pasted or dropped), and it uploads with the server's API secret.
    const auth = requireAdmin(req);
    if (auth instanceof NextResponse) return auth;

    // Parse the incoming form data
    const formData = await req.formData();
    const file = formData.get("file"); // Get the file from the form data

    if (!file || typeof file.arrayBuffer !== "function") {
        return new Response(JSON.stringify({ error: "No file uploaded" }), {
            status: 400,
        });
    }
    // The client checks these too, but the client can be bypassed.
    if (!file.type || !file.type.startsWith("image/")) {
        return new Response(JSON.stringify({ error: "Only image files can be uploaded" }), {
            status: 415,
        });
    }
    if (file.size > MAX_IMAGE_BYTES) {
        return new Response(JSON.stringify({ error: "Images must be 10 MB or smaller" }), {
            status: 413,
        });
    }

    // Convert the buffer to a Node.js readable stream
    const buffer = await file.arrayBuffer(); // Get the file buffer
    const readableStream = new Readable({
        read() {
            this.push(Buffer.from(buffer)); // Push the buffer to the stream
            this.push(null); // Signal the end of the stream
        },
    });

    try {
        // Upload the image buffer to Cloudinary
        const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    resource_type: "image", // images only — never raw/HTML/PDF
                    upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
                },
                (error, result) => {
                    if (error) {
                        console.error("Error uploading to Cloudinary:", error);
                        reject(
                            new Response(
                                JSON.stringify({
                                    error: "Failed to upload image to Cloudinary",
                                }),
                                { status: 500 }
                            )
                        );
                    } else {
                        resolve(result); // Resolve with the result
                    }
                }
            );

            // Pipe the readable stream to Cloudinary
            readableStream.pipe(uploadStream);
        });

        // Return the image URL in the response
        return new Response(JSON.stringify({ url: uploadResult.secure_url }), {
            status: 200,
        });
    } catch (uploadError) {
        console.error("Error uploading to Cloudinary:", uploadError);
        return new Response(
            JSON.stringify({ error: "Failed to upload image to Cloudinary" }),
            { status: 500 }
        );
    }
}
