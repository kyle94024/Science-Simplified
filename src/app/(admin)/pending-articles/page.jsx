"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { FileText, Clock, CheckCircle, Users } from "lucide-react";
import { withAuth } from "@/components/withAuth/withAuth";
import { PageHeader, EmptyState, SearchInput, StatsCard, StatusBadge } from "@/components/admin";

const PendingArticles = () => {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const fetchArticles = async () => {
            try {
                const response = await fetch("/api/articles/pending");
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
        if (!searchQuery) return articles;
        const query = searchQuery.toLowerCase();
        return articles.filter(
            (article) =>
                article.title?.toLowerCase().includes(query) ||
                article.authors?.toLowerCase().includes(query)
        );
    }, [articles, searchQuery]);

    // Calculate stats
    const stats = useMemo(() => {
        const total = articles.length;
        const withEditors = articles.filter(
            (a) => a.assigned_editors?.length > 0
        ).length;
        return {
            total,
            withEditors,
            unassigned: total - withEditors,
        };
    }, [articles]);

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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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

            {/* Articles List */}
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
                <div className="space-y-4">
                    {filteredArticles.map((article) => (
                        <ArticleCard key={article.id} article={article} />
                    ))}
                </div>
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

function ArticleCard({ article }) {
    const hasEditors = article.assigned_editors?.length > 0;

    return (
        <Link
            href={`/pending-articles/${article.id}`}
            className="admin-card admin-card-interactive block"
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
                        <StatusBadge
                            variant={hasEditors ? "success" : "warning"}
                            label={hasEditors ? "Assigned" : "Unassigned"}
                        />
                    </div>

                    {article.authors && (
                        <p className="text-[1.3rem] text-gray-600 mb-2 line-clamp-1">
                            {article.authors}
                        </p>
                    )}

                    <div className="flex items-center gap-4 text-[1.2rem] text-gray-500">
                        {article.created_at && (
                            <span className="flex items-center gap-1">
                                <Clock size={14} />
                                {new Date(article.created_at).toLocaleDateString()}
                            </span>
                        )}
                        {hasEditors && (
                            <span className="flex items-center gap-1">
                                <Users size={14} />
                                {article.assigned_editors.length} editor
                                {article.assigned_editors.length !== 1 ? "s" : ""}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
}

export default withAuth(PendingArticles);
