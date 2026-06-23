import { useState, useEffect } from "react";
import { Button } from "../ui/button";

const ImageUpload = ({
    onImageUpload,
    initialImageUrl,
    uploadUrl = "/api/images/upload-image",
    deleteUrl = "/api/images/delete-image",
    imageType = "default",
    autoUpload = false, // upload immediately on file select (no button)
}) => {
    const [file, setFile] = useState(null);
    const [uploadedUrl, setUploadedUrl] = useState(initialImageUrl || null);
    const [uploading, setUploading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState(null);

    // ✅ Make sure uploadedUrl updates when AI generates an image
    useEffect(() => {
        setUploadedUrl(initialImageUrl || null);
    }, [initialImageUrl]);

    const handleChange = (event) => {
        const selected = event.target.files[0];
        setFile(selected);
        setError(null);
        // In auto mode, uploading happens immediately on select — no button.
        if (autoUpload && selected) handleUpload(selected);
    };

    const handleUpload = async (fileToUpload) => {
        const f = fileToUpload || file;
        if (!f) {
            setError("Please select a file to upload.");
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append("file", f);
        formData.append("imageType", imageType);

        try {
            const response = await fetch(uploadUrl, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                setError("Upload failed. Please try again.");
                return;
            }

            const data = await response.json();
            setUploadedUrl(data.url);
            onImageUpload(data.url);
            setFile(null);
        } catch {
            setError("An error occurred during upload.");
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async () => {
        if (!uploadedUrl) return;

        setDeleting(true);
        setError(null);

        try {
            const publicId = uploadedUrl.split("/").pop().split(".")[0];

            const response = await fetch(deleteUrl, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    public_id: publicId,
                    imageType,
                }),
            });

            if (!response.ok) {
                setError("Delete failed. Please try again.");
                return;
            }

            setUploadedUrl(null);
            setFile(null);
            onImageUpload(null);
        } catch {
            setError("An error occurred during deletion.");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="flex flex-col gap-4">

            {/* File input — always usable so an existing image can be replaced */}
            <input
                type="file"
                onChange={handleChange}
                className="image-upload__input w-full md:w-max file:py-[2rem] file:px-[3.5rem] file:rounded-[10px] file:border-0 file:text-2.1rem file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90"
                accept="image/*"
                disabled={uploading}
            />

            {/* Upload / replace button — appears once a new file is chosen.
                Hidden in auto-upload mode (upload happens on select). */}
            {!autoUpload && file && (
                <Button
                    className="btn btn-primary"
                    type="button"
                    onClick={() => handleUpload()}
                    disabled={uploading}
                >
                    {uploading
                        ? "Uploading..."
                        : uploadedUrl
                        ? "Replace Image"
                        : "Upload Image to Cloud"}
                </Button>
            )}
            {autoUpload && uploading && (
                <p className="image-upload__status">Uploading…</p>
            )}

            {/* Delete button — ALWAYS appears when uploadedUrl exists */}
            {uploadedUrl && (
                <Button
                    className="btn btn-primary-red"
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                >
                    {deleting ? "Deleting..." : "Delete Image"}
                </Button>
            )}

            {error && <p style={{ color: "red" }}>{error}</p>}
        </div>
    );
};

export default ImageUpload;