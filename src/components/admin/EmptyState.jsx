"use client";

import { FileText, Inbox, Search, Users, AlertCircle } from "lucide-react";

const iconMap = {
    articles: FileText,
    inbox: Inbox,
    search: Search,
    users: Users,
    alert: AlertCircle,
};

/**
 * Consistent empty state component
 * @param {Object} props
 * @param {string} [props.icon] - Icon name: 'articles' | 'inbox' | 'search' | 'users' | 'alert'
 * @param {string} props.title - Empty state title
 * @param {string} [props.description] - Optional description text
 * @param {React.ReactNode} [props.action] - Optional action button/link
 */
export default function EmptyState({
    icon = "inbox",
    title,
    description,
    action
}) {
    const Icon = iconMap[icon] || Inbox;

    return (
        <div className="empty-state">
            <Icon className="empty-state-icon" strokeWidth={1.5} />
            <h3 className="empty-state-title">{title}</h3>
            {description && (
                <p className="empty-state-description">{description}</p>
            )}
            {action && <div className="mt-2">{action}</div>}
        </div>
    );
}
