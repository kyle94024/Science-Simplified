"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { FileText, Clock, CheckCircle, Users, Star } from "lucide-react";
import { withAuth } from "@/components/withAuth/withAuth";
import useAuthStore from "@/store/useAuthStore";
import PageHeader from "@/components/admin/PageHeader";
import EmptyState from "@/components/admin/EmptyState";
import SearchInput from "@/components/admin/SearchInput";
import StatsCard from "@/components/admin/StatsCard";
import StatusBadge from "@/components/admin/StatusBadge";

const PendingArticles = () => {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const { user } = useAuthStore();
    const currentUserId = user?.userId;

    useEffect(() => {
        const fetchArticles = async () => {
            try {
                // Use the assignments-aware route so we can split the list.
                const response = await fetch("/api/articles/pending-with-assignments");
                if (!response.ok) throw new Error("Failed to fetch articles");
                const data = await response.json();
                setArticles(data);
            } catch (error) {
                console.error("Error fetching pending articles:", error);
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        fetchArticles();
    }, []);

    // Filter articles based on search
    const filteredArticles = useMemo(() => {
        const queryLower = searchQuery.toLowerCase();
        return articles.filter((article) => {
            if (!queryLower) return true;
            const titleMatch = article.title?.toLowerCase().includes(queryLower);
            const authorsMatch =
                Array.isArray(article.authors) &&
                article.authors.join(" ").toLowerCase().includes(queryLower);
            return titleMatch || authorsMatch;
        });
    }, [articles, searchQuery]);

    // Split into "assigned to me" and "everything else"
    const { assignedToMe, others } = useMemo(() => {
        const mine = [];
        const rest = [];
        for (const article of filteredArticles) {
            const isMine =
                currentUserId &&
                Array.isArray(article.assigned_editors) &&
                article.assigned_editors.some((e) => e.id === currentUserId);
            if (isMine) mine.push(article);
            else rest.push(article);
        }
        return { assignedToMe: mine, others: rest };
    }, [filteredArticles, currentUserId]);

    // Calculate stats (over the full unfiltered list)
    const stats = useMemo(() => {
        const total = articles.length;
        const withEditors = articles.filter(
            (a) => a.assigned_editors?.length > 0
        ).length;
        const mine = currentUserId
            ? articles.filter(
                  (a) =>
                      Array.isArray(a.assigned_editors) &&
                      a.assigned_editors.some((e) => e.id === currentUserId)
              ).length
            : 0;
        return {
            total,
            withEditors,
            unassigned: total - withEditors,
            mine,
        };
    }, [articles, currentUserId]);

    if (loading) {
        return (
            <div className="animate-fadeIn">
                <PageHeader
                    title="Pending Articles"
                    subtitle="Review and manage articles awaiting publication"
                    backHref="/"
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="skeleton h-24 rounded-xl" />
                    ))}
                </div>
                <div className="space-y-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="skeleton h-32 rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="animate-fadeIn">
                <PageHeader
                    title="Pending Articles"
                    subtitle="Review and manage articles awaiting publication"
                    backHref="/"
                />
                <div className="admin-card">
                    <EmptyState
                        icon="alert"
                        title="Error loading articles"
                        description="There was a problem fetching the pending articles. Please try again."
                        action={
                            <button
                                onClick={() => window.location.reload()}
                                className="btn btn-primary-green btn-sm"
                            >
                                Retry
                            </button>
                        }
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fadeIn">
            <PageHeader
                title="Pending Articles"
                subtitle="Review and manage articles awaiting publication"
                backHref="/"
                actions={
                    <Link href="/add-article" className="btn btn-primary-green btn-sm">
                        Add Article
                    </Link>
                }
            />

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <StatsCard
                    label="Assigned to you"
                    value={stats.mine}
                    icon={Star}
                />
                <StatsCard
                    label="Total Pending"
                    value={stats.total}
                    icon={FileText}
                />
                <StatsCard
                    label="Assigned to Editors"
                    value={stats.withEditors}
                    icon={Users}
                />
                <StatsCard
                    label="Unassigned"
                    value={stats.unassigned}
                    icon={Clock}
                />
            </div>

            {/* Search & Filters */}
            <div className="mb-6">
                <SearchInput
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search articles by title or author..."
                    className="max-w-md"
                />
            </div>

            {filteredArticles.length === 0 ? (
                <div className="admin-card">
                    <EmptyState
                        icon="articles"
                        title={searchQuery ? "No matching articles" : "No pending articles"}
                        description={
                            searchQuery
                                ? "Try adjusting your search terms"
                                : "All articles have been reviewed and published"
                        }
                    />
                </div>
            ) : (
                <>
                    {/* Assigned to you — green-highlighted section */}
                    {assignedToMe.length > 0 && (
                        <section className="mb-8">
                            <div className="flex items-center gap-3 mb-4 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200">
                                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-emerald-500 text-white">
                                    <Star size={18} fill="currentColor" />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-[1.7rem] font-bold text-emerald-900">
                                        Assigned to you
                                    </h2>
                                    <p className="text-[1.3rem] text-emerald-700">
                                        {assignedToMe.length} article{assignedToMe.length === 1 ? "" : "s"} waiting on your review
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                {assignedToMe.map((article) => (
                                    <ArticleCard
                                        key={article.id}
                                        article={article}
                                        currentUserId={currentUserId}
                                        highlight
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* All other pending articles */}
                    {others.length > 0 && (
                        <section>
                            {assignedToMe.length > 0 && (
                                <div className="flex items-center gap-3 mb-4 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200">
                                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-400 text-white">
                                        <FileText size={18} />
                                    </div>
                                    <div className="flex-1">
                                        <h2 className="text-[1.7rem] font-bold text-gray-800">
                                            All other pending articles
                                        </h2>
                                        <p className="text-[1.3rem] text-gray-600">
                                            {others.length} article{others.length === 1 ? "" : "s"}
                                        </p>
                                    </div>
                                </div>
                            )}
                            <div className="space-y-4">
                                {others.map((article) => (
                                    <ArticleCard
                                        key={article.id}
                                        article={article}
                                        currentUserId={currentUserId}
                                    />
                                ))}
                            </div>
                        </section>
                    )}
                </>
            )}

            {/* Results count */}
            {searchQuery && filteredArticles.length > 0 && (
                <p className="text-[1.3rem] text-gray-500 mt-4">
                    Showing {filteredArticles.length} of {articles.length} articles
                </p>
            )}
        </div>
    );
};

function ArticleCard({ article, currentUserId, highlight }) {
    const hasEditors = article.assigned_editors?.length > 0;

    return (
        <Link
            href={`/pending-articles/${article.id}`}
            className={`admin-card admin-card-interactive block ${
                highlight ? "border-l-4 border-l-emerald-500" : ""
            }`}
        >
            <div className="p-5 flex gap-5">
                {/* Thumbnail */}
                <div className="flex-shrink-0">
                    <img
                        src={article.image_url || "/default-article-image.png"}
                        alt=""
                        className="w-24 h-24 object-cover rounded-lg bg-gray-100"
                    />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                        <h3 className="text-[1.6rem] font-semibold text-gray-900 line-clamp-2">
                            {article.title}
                        </h3>
                        {highlight ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[1.1rem] font-bold whitespace-nowrap">
                                <Star size={11} fill="currentColor" /> You
                            </span>
                        ) : (
                            <StatusBadge
                                variant={hasEditors ? "success" : "warning"}
                                label={hasEditors ? "Assigned" : "Unassigned"}
                            />
                        )}
                    </div>

                    {article.authors && (
                        <p className="text-[1.3rem] text-gray-600 mb-2 line-clamp-1">
                            {article.authors}
                        </p>
                    )}

                    <div className="flex items-center gap-4 text-[1.2rem] text-gray-500 flex-wrap">
                        {article.created_at && (
                            <span className="flex items-center gap-1">
                                <Clock size={14} />
                                {new Date(article.created_at).toLocaleDateString()}
                            </span>
                        )}
                        {hasEditors && (
                            <span className="flex items-center gap-1">
                                <Users size={14} />
                                {article.assigned_editors
                                    .map((e) => e.name || e.email)
                                    .join(", ")}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
}

export default withAuth(PendingArticles);
