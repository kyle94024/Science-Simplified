"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * Consistent page header for admin pages
 * @param {Object} props
 * @param {string} props.title - Page title
 * @param {string} [props.subtitle] - Optional subtitle/description
 * @param {string} [props.backHref] - Optional back link URL
 * @param {string} [props.backLabel] - Optional custom back link label
 * @param {React.ReactNode} [props.actions] - Optional action buttons
 * @param {React.ReactNode} [props.children] - Optional additional content below header
 */
export default function PageHeader({
    title,
    subtitle,
    backHref,
    backLabel = "Back",
    actions,
    children
}) {
    return (
        <div className="page-header">
            {backHref && (
                <Link
                    href={backHref}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-2 w-fit"
                >
                    <ArrowLeft size={18} />
                    <span className="text-[1.4rem] font-medium">{backLabel}</span>
                </Link>
            )}
            <div className="page-header-row">
                <div>
                    <h1 className="page-header-title">{title}</h1>
                    {subtitle && (
                        <p className="page-header-subtitle">{subtitle}</p>
                    )}
                </div>
                {actions && (
                    <div className="page-header-actions">
                        {actions}
                    </div>
                )}
            </div>
            {children}
        </div>
    );
}
