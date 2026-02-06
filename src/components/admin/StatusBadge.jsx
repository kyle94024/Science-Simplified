"use client";

import { Check, Clock, AlertCircle, XCircle, Info, Loader2 } from "lucide-react";

const variants = {
    success: {
        className: "badge badge-success",
        icon: Check,
    },
    warning: {
        className: "badge badge-warning",
        icon: Clock,
    },
    error: {
        className: "badge badge-error",
        icon: XCircle,
    },
    info: {
        className: "badge badge-info",
        icon: Info,
    },
    neutral: {
        className: "badge badge-neutral",
        icon: null,
    },
    primary: {
        className: "badge badge-primary",
        icon: null,
    },
    pending: {
        className: "badge badge-warning",
        icon: Clock,
    },
    active: {
        className: "badge badge-success",
        icon: Check,
    },
    used: {
        className: "badge badge-neutral",
        icon: Check,
    },
    loading: {
        className: "badge badge-info",
        icon: Loader2,
    },
};

/**
 * Consistent status badge component
 * @param {Object} props
 * @param {'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary' | 'pending' | 'active' | 'used' | 'loading'} props.variant
 * @param {string} props.label - Badge text
 * @param {boolean} [props.showIcon] - Whether to show the icon
 * @param {'sm' | 'md' | 'lg'} [props.size] - Badge size
 */
export default function StatusBadge({
    variant = "neutral",
    label,
    showIcon = true,
    size = "md"
}) {
    const config = variants[variant] || variants.neutral;
    const Icon = config.icon;

    const sizeClass = size === "sm" ? "badge-sm" : size === "lg" ? "badge-lg" : "";

    return (
        <span className={`${config.className} ${sizeClass}`}>
            {showIcon && Icon && (
                <Icon
                    size={size === "sm" ? 10 : size === "lg" ? 16 : 12}
                    className={variant === "loading" ? "animate-spin" : ""}
                />
            )}
            {label}
        </span>
    );
}
