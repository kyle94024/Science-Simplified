"use client";

import { useState, useEffect, useMemo } from "react";
import { Star, FileText, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { withAuth } from "@/components/withAuth/withAuth";
import { toast } from "react-toastify";
import PageHeader from "@/components/admin/PageHeader";
import EmptyState from "@/components/admin/EmptyState";
import SearchInput from "@/components/admin/SearchInput";
import StatsCard from "@/components/admin/StatsCard";
import StatusBadge from "@/components/admin/StatusBadge";

const FeaturedArticles = () => {
    const [featuredArticles, setFeaturedArticles] = useState([]);
    const [otherArticles, setOtherArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("featured");
    const [togglingId, setTogglingId] = useState(null);

    const fetchArticles = async () => {
        setLoading(true);
        setError(false);
        try {
            const [featuredResp, allResp] = await Promise.all([
                fetch("/api/articles/featured"),
                fetch("/api/articles"),
            ]);

            if (!featuredResp.ok || !allResp.ok) {
                throw new Error("Failed to fetch articles");
            }

            const featuredData = await featuredResp.json();
            const allData = await allResp.json();

            const featuredIds = new Set(featuredData.map((article) => article.id));
            const othersData = allData.filter((article) => !featuredIds.has(article.id));

            setFeaturedArticles(featuredData);
            setOtherArticles(othersData);
        } catch (error) {
            console.error("Error fetching articles:", error);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchArticles();
    }, []);

    // Filter articles based on search
    const filteredFeatured = useMemo(() => {
        if (!searchQuery) return featuredArticles;
        const query = searchQuery.toLowerCase();
        return featuredArticles.filter(
            (article) =>
                article.title?.toLowerCase().includes(query) ||
                article.authors?.toLowerCase().includes(query)
        );
    }, [featuredArticles, searchQuery]);

    const filteredOthers = useMemo(() => {
        if (!searchQuery) return otherArticles;
        const query = searchQuery.toLowerCase();
        return otherArticles.filter(
            (article) =>
                article.title?.toLowerCase().includes(query) ||
                article.authors?.toLowerCase().includes(query)
        );
    }, [otherArticles, searchQuery]);

    const handleToggleFeatured = async (articleId, currentlyFeatured) => {
        setTogglingId(articleId);
        try {
            const response = await fetch("/api/articles/toggle-featured", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ articleId, featured: !currentlyFeatured }),
            });

            if (!response.ok) throw new Error("Failed to update featured status");

            toast.success(currentlyFeatured ? "Article removed from featured" : "Article added to featured!");
            fetchArticles();
        } catch (err) {
            toast.error("Failed to update featured status");
        } finally {
            setTogglingId(null);
        }
    };

    return (
        <div className="animate-fadeIn">
            <PageHeader
                title="Featured Articles"
                subtitle="Manage which articles appear in the featured section"
                backHref="/"
            />

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <StatsCard
                    label="Featured Articles"
                    value={loading ? "..." : featuredArticles.length}
                    icon={Star}
                />
                <StatsCard
                    label="Other Articles"
                    value={loading ? "..." : otherArticles.length}
                    icon={FileText}
                />
                <StatsCard
                    label="Total Published"
                    value={loading ? "..." : featuredArticles.length + otherArticles.length}
                    icon={CheckCircle}
                />
            </div>

            {/* Search */}
            <div className="mb-6">
                <SearchInput
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search articles by title or author..."
                    className="max-w-md"
                />
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-6 p-1 bg-gray-100 rounded-lg inline-flex">
                    <TabsTrigger
                        value="featured"
                        className={`px-6 py-3 text-[1.4rem] font-medium rounded-md transition-all ${
                            activeTab === "featured"
                                ? "bg-white shadow-sm text-gray-900"
                                : "text-gray-600 hover:text-gray-900"
                        }`}
                    >
                        <Star size={16} className="mr-2" />
                        Featured ({featuredArticles.length})
                    </TabsTrigger>
                    <TabsTrigger
                        value="others"
                        className={`px-6 py-3 text-[1.4rem] font-medium rounded-md transition-all ${
                            activeTab === "others"
                                ? "bg-white shadow-sm text-gray-900"
                                : "text-gray-600 hover:text-gray-900"
                        }`}
                    >
                        <FileText size={16} className="mr-2" />
                        Others ({otherArticles.length})
                    </TabsTrigger>
                </TabsList>

                {/* Featured Articles Tab */}
                <TabsContent value="featured">
                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="skeleton h-28 rounded-xl" />
                            ))}
                        </div>
                    ) : error ? (
                        <div className="admin-card">
                            <EmptyState
                                icon="alert"
                                title="Error loading articles"
                                description="Please try again later."
                                action={
                                    <button
                                        onClick={fetchArticles}
                                        className="btn btn-primary-green btn-sm"
                                    >
                                        Retry
                                    </button>
                                }
                            />
                        </div>
                    ) : filteredFeatured.length === 0 ? (
                        <div className="admin-card">
                            <EmptyState
                                icon="articles"
                                title={searchQuery ? "No matching featured articles" : "No featured articles"}
                                description={
                                    searchQuery
                                        ? "Try a different search term"
                                        : "Add articles to featured from the 'Others' tab"
                                }
                            />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredFeatured.map((article) => (
                                <ArticleCard
                                    key={article.id}
                                    article={article}
                                    isFeatured={true}
                                    onToggle={handleToggleFeatured}
                                    isToggling={togglingId === article.id}
                                />
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* Other Articles Tab */}
                <TabsContent value="others">
                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="skeleton h-28 rounded-xl" />
                            ))}
                        </div>
                    ) : error ? (
                        <div className="admin-card">
                            <EmptyState
                                icon="alert"
                                title="Error loading articles"
                                description="Please try again later."
                                action={
                                    <button
                                        onClick={fetchArticles}
                                        className="btn btn-primary-green btn-sm"
                                    >
                                        Retry
                                    </button>
                                }
                            />
                        </div>
                    ) : filteredOthers.length === 0 ? (
                        <div className="admin-card">
                            <EmptyState
                                icon="articles"
                                title={searchQuery ? "No matching articles" : "No other articles"}
                                description={
                                    searchQuery
                                        ? "Try a different search term"
                                        : "All articles are currently featured!"
                                }
                            />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredOthers.map((article) => (
                                <ArticleCard
                                    key={article.id}
                                    article={article}
                                    isFeatured={false}
                                    onToggle={handleToggleFeatured}
                                    isToggling={togglingId === article.id}
                                />
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Results count */}
            {searchQuery && (
                <p className="text-[1.3rem] text-gray-500 mt-4">
                    {activeTab === "featured"
                        ? `Showing ${filteredFeatured.length} of ${featuredArticles.length} featured articles`
                        : `Showing ${filteredOthers.length} of ${otherArticles.length} other articles`}
                </p>
            )}
        </div>
    );
};

function ArticleCard({ article, isFeatured, onToggle, isToggling }) {
    return (
        <div className="admin-card p-5 flex gap-5 items-center">
            {/* Thumbnail */}
            <img
                src={article.image_url || "/default-article-image.png"}
                alt=""
                className="w-20 h-20 object-cover rounded-lg bg-gray-100 flex-shrink-0"
            />

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start gap-4 mb-1">
                    <h3 className="text-[1.5rem] font-semibold text-gray-900 line-clamp-1">
                        {article.title}
                    </h3>
                </div>
                {article.authors && (
                    <p className="text-[1.3rem] text-gray-500 line-clamp-1">
                        {article.authors}
                    </p>
                )}
            </div>

            {/* Featured Toggle Button */}
            <button
                onClick={() => onToggle(article.id, isFeatured)}
                disabled={isToggling}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[1.3rem] font-medium transition-all ${
                    isToggling
                        ? "opacity-50 cursor-not-allowed"
                        : isFeatured
                        ? "bg-red-50 text-red-600 hover:bg-red-100"
                        : "bg-[rgba(76,177,159,0.1)] text-[#4cb19f] hover:bg-[rgba(76,177,159,0.2)]"
                }`}
            >
                {isToggling ? (
                    <Loader2 size={16} className="animate-spin" />
                ) : isFeatured ? (
                    <XCircle size={16} />
                ) : (
                    <Star size={16} />
                )}
                {isFeatured ? "Remove from Featured" : "Add to Featured"}
            </button>
        </div>
    );
}

export default withAuth(FeaturedArticles);
