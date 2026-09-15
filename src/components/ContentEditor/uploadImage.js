/**
 * Image upload for the editor. Every image — picked, pasted or dropped — goes
 * through /api/images/upload-image and comes back as a Cloudinary URL; the
 * schema refuses base64 so nothing else can end up in the database.
 */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export function isImageFile(file) {
    return !!file && typeof file.type === "string" && file.type.startsWith("image/");
}

/** "brain-scan.final.png" → "brain-scan.final" */
export function altFromFilename(name = "") {
    return name.replace(/\.[^./\\]+$/, "");
}

/** Resolves to { src, alt }; throws an Error with a user-facing message. */
export async function uploadImage(file) {
    if (!isImageFile(file)) {
        throw new Error("Only image files can be inserted.");
    }
    if (file.size > MAX_IMAGE_BYTES) {
        throw new Error(`"${file.name}" is larger than 10 MB. Please use a smaller image.`);
    }

    const body = new FormData();
    body.append("file", file);

    let response;
    try {
        response = await fetch("/api/images/upload-image", { method: "POST", body });
    } catch {
        throw new Error("Image upload failed. Check your connection and try again.");
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.url) {
        // The route reports its own errors as `error`; the auth guard uses `message`.
        if (response.status === 401 || response.status === 403) {
            throw new Error("Please sign in again to upload images.");
        }
        throw new Error(data?.error || data?.message || "Image upload failed. Please try again.");
    }

    return { src: data.url, alt: altFromFilename(file.name) };
}
