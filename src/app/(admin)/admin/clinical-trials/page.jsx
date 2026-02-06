"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Beaker, ExternalLink } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import SearchInput from "@/components/admin/SearchInput";
import EmptyState from "@/components/admin/EmptyState";
import StatsCard from "@/components/admin/StatsCard";

const TENANTS = ["HS", "NF", "EB"];

export default function AdminTrialsPage() {
    const [tenant, setTenant] = useState("HS");
    const [trials, setTrials] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            const res = await fetch(`/api/admin/clinical-trials?tenant=${tenant}`, {
                cache: "no-store",
            });
            const data = await res.json();

            if (!cancelled) {
                setTrials(data.trials || []);
                setLoading(false);
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [tenant]);

    const filteredTrials = useMemo(() => {
        if (!searchQuery) return trials;
        const query = searchQuery.toLowerCase();
        return trials.filter(
            (trial) =>
                trial.short_title?.toLowerCase().includes(query) ||
                trial.nct_id?.toLowerCase().includes(query)
        );
    }, [trials, searchQuery]);

    return (
        <div className="animate-fadeIn">
            <PageHeader
                title="Clinical Trials"
                subtitle="Manage clinical trials content for each tenant"
                backHref="/"
                actions={
                    <Link href="/admin/sync" className="btn btn-primary-green btn-sm">
                        Sync Trials
                    </Link>
                }
            />

            {/* Stats and Tenant Selector */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <StatsCard
                    label="Total Trials"
                    value={loading ? "..." : trials.length}
                    icon={Beaker}
                />
                <div className="admin-card p-4 md:col-span-2">
                    <div className="flex items-center gap-4">
                        <label className="text-[1.4rem] font-medium text-gray-700">
                            Current Tenant:
                        </label>
                        <div className="flex gap-2">
                            {TENANTS.map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setTenant(t)}
                                    className={`px-4 py-2 rounded-lg text-[1.4rem] font-medium transition-all ${
                                        tenant === t
                                            ? "bg-[#4cb19f] text-white"
                                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="mb-6">
                <SearchInput
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search trials by title or NCT ID..."
                    className="max-w-md"
                />
            </div>

            {/* Trials Grid */}
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
                                : `No clinical trials available for ${tenant}. Try syncing trials first.`
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
                    {filteredTrials.map((trial) => (
                        <Link
                            key={`${tenant}-${trial.nct_id}`}
                            href={`/admin/clinical-trials/${trial.nct_id}?tenant=${tenant}`}
                            className="admin-card admin-card-interactive p-5 block"
                        >
                            <div className="flex items-start justify-between gap-3 mb-3">
                                <span className="badge badge-primary">
                                    {trial.nct_id}
                                </span>
                                <ExternalLink size={16} className="text-gray-400" />
                            </div>
                            <h3 className="text-[1.5rem] font-medium text-gray-900 line-clamp-2">
                                {trial.short_title || trial.nct_id}
                            </h3>
                        </Link>
                    ))}
                </div>
            )}

            {/* Results count */}
            {searchQuery && filteredTrials.length > 0 && (
                <p className="text-[1.3rem] text-gray-500 mt-4">
                    Showing {filteredTrials.length} of {trials.length} trials
                </p>
            )}
        </div>
    );
}
