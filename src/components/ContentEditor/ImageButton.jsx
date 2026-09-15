import { useRef } from "react";
import { ImagePlus } from "lucide-react";
import { ToolbarButton } from "./ToolbarButton";

/** Toolbar image button + its hidden file picker. Upload itself lives in Editor.jsx. */
export function ImageButton({ uploading, onFiles }) {
    const inputRef = useRef(null);

    return (
        <>
            <ToolbarButton
                icon={ImagePlus}
                label="Insert image"
                busy={uploading}
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
            />
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                hidden
                tabIndex={-1}
                aria-hidden="true"
                onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    e.target.value = "";
                    if (files.length) onFiles(files);
                }}
            />
        </>
    );
}
