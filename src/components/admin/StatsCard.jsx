"use client";

import { TrendingUp, TrendingDown } from "lucide-react";

/**
 * Stats display card for dashboards
 * @param {Object} props
 * @param {string} props.label - Stat label
 * @param {string|number} props.value - Main value to display
 * @param {string} [props.change] - Change indicator (e.g., "+12%")
 * @param {'positive' | 'negative' | 'neutral'} [props.changeType] - Type of change
 * @param {React.ReactNode} [props.icon] - Optional icon component
 * @param {string} [props.className] - Additional classes
 */
export default function StatsCard({
    label,
    value,
    change,
    changeType = "neutral",
    icon: Icon,
    className = ""
}) {
    return (
        <div className={`stats-card ${className}`}>
            <div className="flex items-center justify-between">
                <span className="stats-card-label">{label}</span>
                {Icon && (
                    <div className="text-gray-400">
                        {typeof Icon === "function" ? <Icon size={20} /> : Icon}
                    </div>
                )}
            </div>
            <div className="stats-card-value">{value}</div>
            {change && (
                <div
                    className={`stats-card-change ${
                        changeType === "positive"
                            ? "stats-card-change-positive"
                            : changeType === "negative"
                            ? "stats-card-change-negative"
                            : "text-gray-500"
                    }`}
                >
                    {changeType === "positive" && <TrendingUp size={14} />}
                    {changeType === "negative" && <TrendingDown size={14} />}
                    {change}
                </div>
            )}
        </div>
    );
}
