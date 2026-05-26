import { ImageResponse } from "next/og";
import { tenant } from "@/lib/config";

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

const faviconConfig = {
    NF: { label: "NF", bg: "#4cb19f", color: "#fff" },
    EB: { label: "EB", bg: "#ed1e87", color: "#fff" },
    CF: { label: "CF", bg: "#448178", color: "#fff" },
    Ashermans: { label: "AS", bg: "#f7d297", color: "#333" },
    Aicardi: { label: "Ai", bg: "#6d32a8", color: "#fff" },
    RYR1: { label: "R1", bg: "#ba4e14", color: "#fff" },
    ALS: { label: "ALS", bg: "#2f99eb", color: "#fff" },
    RETT: { label: "RS", bg: "#d43ad6", color: "#fff" },
    Huntingtons: { label: "HD", bg: "#d43ad6", color: "#fff" },
    Progeria: { label: "PG", bg: "#d43ad6", color: "#fff" },
    Canavan: { label: "CD", bg: "#135a70", color: "#fff" },
    Vitiligo: { label: "V", bg: "#a319b3", color: "#fff" },
    Turners: { label: "TS", bg: "#7B2D8E", color: "#fff" },
    HS: { label: "HS", bg: "#7B2CBF", color: "#fff" },
    RUNX1: { label: "R1", bg: "#701616", color: "#fff" },
    Scleroderma: { label: "Sc", bg: "#004990", color: "#fff" },
    Myositis: { label: "MS", bg: "#191548", color: "#fff" },
};

export default function Icon() {
    const config = faviconConfig[tenant.pathName] || {
        label: "SS",
        bg: "#4cb19f",
        color: "#fff",
    };

    const fontSize = config.label.length <= 2 ? "18px" : "14px";

    return new ImageResponse(
        (
            <div
                style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "6px",
                    backgroundColor: config.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <span
                    style={{
                        color: config.color,
                        fontSize,
                        fontWeight: 700,
                        fontFamily: "sans-serif",
                        letterSpacing: "-0.5px",
                        lineHeight: 1,
                    }}
                >
                    {config.label}
                </span>
            </div>
        ),
        { ...size }
    );
}
