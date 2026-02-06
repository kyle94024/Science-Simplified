"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { FileText, Clock, CheckCircle, ArrowRight } from "lucide-react";
import { withEditorAuth } from "@/components/withEditorAuth/withEditorAuth";
import Navbar from "@/components/Navbar/Navbar";
import Footer from "@/components/Footer/Footer";
import useAuthStore from "@/store/useAuthStore";
import { PageHeader, EmptyState, SearchInput, StatsCard, StatusBadge } from "@/components/admin";

const EditorAssignedArticles = () => {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const { user } = useAuthStore();

    useEffect(() => {
        if (!user?.userId) return;

        const fetchAssigned = async () => {
            setLoading(true);
            setError(false);

            try {
                const response = await fetch(
                    `/api/editors/assigned-articles?editorId=${user.userId}`
                );

                if (!response.ok) throw new Error("Failed to fetch assigned articles");

                const data = await response.json();
                setArticles(data);
            } catch (err) {
                console.error("Error fetching assigned articles:", err);
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        fetchAssigned();
    }, [user?.userId]);

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
        const completed = articles.filter((a) => a.status === "published").length;
        const pending = total - completed;
        return { total, completed, pending };
    }, [articles]);

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1 p-6 lg:p-8 bg-gray-50">
                <div className="max-w-6xl mx-auto animate-fadeIn">
                    {/* Welcome Message */}
                    <div className="mb-8">
                        <h1 className="text-[2.8rem] font-bold text-gray-900 mb-2">
                            Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}!
                        </h1>
                        <p className="text-[1.6rem] text-gray-600">
                            Here are the articles assigned to you for review and editing.
                        </p>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <StatsCard
                            label="Total Assigned"
                            value={loading ? "..." : stats.total}
                            icon={FileText}
                        />
                        <StatsCard
                            label="Pending Review"
                            value={loading ? "..." : stats.pending}
                            icon={Clock}
                        />
                        <StatsCard
                            label="Completed"
                            value={loading ? "..." : stats.completed}
                            icon={CheckCircle}
                        />
                    </div>

                    {/* Search */}
                    {!loading && articles.length > 0 && (
                        <div className="mb-6">
                            <SearchInput
                                value={searchQuery}
                                onChange={setSearchQuery}
                                placeholder="Search articles by title or author..."
                                className="max-w-md"
                            />
                        </div>
                    )}

                    {/* Content */}
                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="skeleton h-32 rounded-xl" />
                            ))}
                        </div>
                    ) : error ? (
                        <div className="admin-card">
                            <EmptyState
                                icon="alert"
                                title="Error loading articles"
                                description="There was a problem fetching your assigned articles. Please try again."
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
                    ) : filteredArticles.length === 0 ? (
                        <div className="admin-card">
                            <EmptyState
                                icon="articles"
                                title={searchQuery ? "No matching articles" : "No articles assigned"}
                                description={
                                    searchQuery
                                        ? "Try adjusting your search terms"
                                        : "You don't have any articles assigned to you yet. Check back later!"
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
            </main>
            <Footer />
        </div>
    );
};

function ArticleCard({ article }) {
    const isPublished = article.status === "published";

    return (
        <Link
            href={`/assigned-articles/${article.id}`}
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
                            variant={isPublished ? "success" : "warning"}
                            label={isPublished ? "Published" : "Pending"}
                        />
                    </div>

                    {article.authors && (
                        <p className="text-[1.3rem] text-gray-600 mb-3 line-clamp-1">
                            {article.authors}
                        </p>
                    )}

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-[1.2rem] text-gray-500">
                            {article.created_at && (
                                <span className="flex items-center gap-1">
                                    <Clock size={14} />
                                    Assigned {new Date(article.created_at).toLocaleDateString()}
                                </span>
                            )}
                        </div>
                        <span className="flex items-center gap-1 text-[1.3rem] text-[#4cb19f] font-medium">
                            Review Article
                            <ArrowRight size={16} />
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    );
}

export default withEditorAuth(EditorAssignedArticles);
