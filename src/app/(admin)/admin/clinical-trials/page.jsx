"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Beaker, ExternalLink, BadgeCheck, AlertCircle, ClipboardList } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import SearchInput from "@/components/admin/SearchInput";
import EmptyState from "@/components/admin/EmptyState";
import StatsCard from "@/components/admin/StatsCard";
import { tenant } from "@/lib/config";

export default function AdminTrialsPage() {
    const currentTenant = tenant.shortName;

    const [trials, setTrials] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [filter, setFilter] = useState("all"); // all | verified | unverified

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoading(true);
            const res = await fetch(
                `/api/admin/clinical-trials?tenant=${currentTenant}`,
                { cache: "no-store" }
            );
            const data = await res.json();
            if (!cancelled) {
                setTrials(data.trials || []);
                setLoading(false);
            }
        }
        load();
        return () => { cancelled = true; };
    }, [currentTenant]);

    const verifiedCount = useMemo(
        () => trials.filter((t) => t.verified_by).length,
        [trials]
    );
    const unverifiedCount = trials.length - verifiedCount;
    const awaitingReviewCount = useMemo(
        () => trials.filter((t) => t.workflow_status === "review_submitted").length,
        [trials]
    );

    const filteredTrials = useMemo(() => {
        let list = trials;
        if (filter === "verified") list = list.filter((t) => t.verified_by);
        if (filter === "unverified") list = list.filter((t) => !t.verified_by);
        if (filter === "review") list = list.filter((t) => t.workflow_status === "review_submitted");
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            list = list.filter(
                (t) =>
                    t.short_title?.toLowerCase().includes(q) ||
                    t.nct_id?.toLowerCase().includes(q)
            );
        }
        return list;
    }, [trials, searchQuery, filter]);

    return (
        <div className="animate-fadeIn">
            <PageHeader
                title={`${tenant.name} — Clinical Trials`}
                subtitle="Manage clinical trials content for this tenant"
                backHref="/"
                actions={
                    <Link href="/admin/sync" className="btn btn-primary-green btn-sm">
                        Sync Trials
                    </Link>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <StatsCard label="Total Trials" value={loading ? "..." : trials.length} icon={Beaker} />
                <StatsCard label="Verified" value={loading ? "..." : verifiedCount} icon={BadgeCheck} />
                <StatsCard label="Awaiting Verification" value={loading ? "..." : unverifiedCount} icon={AlertCircle} />
                <StatsCard label="Submitted for Review" value={loading ? "..." : awaitingReviewCount} icon={ClipboardList} />
            </div>

            <div className="flex flex-wrap items-center gap-3 mb-6">
                <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                    <button
                        onClick={() => setFilter("all")}
                        className={`px-3 py-1.5 rounded-md text-[1.3rem] font-medium transition-colors ${
                            filter === "all" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                        }`}
                    >
                        All ({trials.length})
                    </button>
                    <button
                        onClick={() => setFilter("verified")}
                        className={`px-3 py-1.5 rounded-md text-[1.3rem] font-medium transition-colors ${
                            filter === "verified" ? "bg-white text-green-700 shadow-sm" : "text-gray-600 hover:text-green-700"
                        }`}
                    >
                        ✓ Verified ({verifiedCount})
                    </button>
                    <button
                        onClick={() => setFilter("unverified")}
                        className={`px-3 py-1.5 rounded-md text-[1.3rem] font-medium transition-colors ${
                            filter === "unverified" ? "bg-white text-amber-700 shadow-sm" : "text-gray-600 hover:text-amber-700"
                        }`}
                    >
                        ⚠ Unverified ({unverifiedCount})
                    </button>
                    <button
                        onClick={() => setFilter("review")}
                        className={`px-3 py-1.5 rounded-md text-[1.3rem] font-medium transition-colors ${
                            filter === "review" ? "bg-white text-blue-700 shadow-sm" : "text-gray-600 hover:text-blue-700"
                        }`}
                    >
                        📋 Awaiting Review ({awaitingReviewCount})
                    </button>
                </div>
                <SearchInput
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search trials by title or NCT ID..."
                    className="flex-1 max-w-md"
                />
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="skeleton h-32 rounded-xl" />
                    ))}
                </div>
            ) : filteredTrials.length === 0 ? (
                <div className="admin-card">
                    <EmptyState
                        icon="search"
                        title={searchQuery ? "No matching trials" : "No trials found"}
                        description={
                            searchQuery
                                ? "Try a different search term"
                                : `No ${filter !== "all" ? filter + " " : ""}clinical trials available. Try syncing trials first.`
                        }
                        action={
                            !searchQuery ? (
                                <Link href="/admin/sync" className="btn btn-primary-green btn-sm">
                                    Sync Trials
                                </Link>
                            ) : null
                        }
                    />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTrials.map((trial) => {
                        const isVerified = !!trial.verified_by;
                        const isAwaitingReview =
                            !isVerified && trial.workflow_status === "review_submitted";
                        const borderClass = isVerified
                            ? "border-l-green-500 bg-green-50/40"
                            : isAwaitingReview
                                ? "border-l-blue-500 bg-blue-50/40"
                                : "border-l-amber-400 bg-amber-50/30";
                        return (
                            <Link
                                key={`${currentTenant}-${trial.nct_id}`}
                                href={`/admin/clinical-trials/${trial.nct_id}?tenant=${currentTenant}`}
                                className={`admin-card admin-card-interactive p-5 block border-l-4 ${borderClass}`}
                            >
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="badge badge-primary">{trial.nct_id}</span>
                                        {isVerified ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[1.1rem] font-semibold bg-green-100 text-green-800">
                                                <BadgeCheck size={12} /> Verified
                                            </span>
                                        ) : isAwaitingReview ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[1.1rem] font-semibold bg-blue-100 text-blue-800">
                                                <ClipboardList size={12} /> Submitted for review
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[1.1rem] font-semibold bg-amber-100 text-amber-800">
                                                <AlertCircle size={12} /> Needs review
                                            </span>
                                        )}
                                    </div>
                                    <ExternalLink size={16} className="text-gray-400 flex-shrink-0" />
                                </div>
                                <h3 className="text-[1.5rem] font-medium text-gray-900 line-clamp-2 mb-2">
                                    {trial.short_title || trial.nct_id}
                                </h3>
                                {isVerified && trial.verified_by?.name && (
                                    <p className="text-[1.2rem] text-green-700">
                                        Reviewed by {trial.verified_by.name}
                                        {trial.verified_by.degree ? `, ${trial.verified_by.degree}` : ""}
                                    </p>
                                )}
                            </Link>
                        );
                    })}
                </div>
            )}

            {(searchQuery || filter !== "all") && filteredTrials.length > 0 && (
                <p className="text-[1.3rem] text-gray-500 mt-4">
                    Showing {filteredTrials.length} of {trials.length} trials
                </p>
            )}
        </div>
    );
}
