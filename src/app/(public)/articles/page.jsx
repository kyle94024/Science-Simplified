"use client";
import "./ArticleSearchPage.scss";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar/Navbar";
import SearchArticles from "@/components/SearchArticles/SearchArticles";
import ArticlesListPaginated from "@/components/ArticlesListPaginated/ArticlesListPaginated";
import Footer from "@/components/Footer/Footer";
import { Unplug } from "lucide-react";
import { ArticleCardSkeleton } from "@/components/ArticleCardSkeleton/ArticleCardSkeleton";
import ExternalArticlesNotice from "@/components/ExternalArticlesNotice/ExternalArticlesNotice";
import useSearchStore from "@/store/useSearchStore";
import useAuthStore from "@/store/useAuthStore";
import { tenant } from "@/lib/config";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const ArticleSearchPage = () => {
    const { searchQuery } = useSearchStore();
    const { isAdmin, role } = useAuthStore();
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [sortBy, setSortBy] = useState("recent");

    const isHS = tenant.shortName === "HS";
    // Articles published on a partner site (HS → HSF research summaries):
    // patients get a pointer card instead of the listing; staff (admins AND
    // editors) keep the internal listing, with the outbound link in the
    // corner. DB/RSS are untouched.
    const isStaff = isAdmin || role === "editor";
    const patientExternalView = !!tenant.articlesExternalUrl && !isStaff;

    useEffect(() => {
    const fetchArticles = async () => {
        try {
            const response = await fetch(
                `/api/articles?search=${searchQuery}`
            );
            if (!response.ok) throw new Error("Failed to fetch articles");
            const data = await response.json();
            setArticles(data);
        } catch (error) {
            console.error("Error fetching articles:", error);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    // Patients are pointed to the partner site — skip loading the listing.
    if (patientExternalView) {
        setLoading(false);
        return;
    }

    fetchArticles();
}, [searchQuery, sortBy, patientExternalView]);

   const parseDateSafe = (dateStr) => {
  if (!dateStr) return 0;

  const months = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3,
    May: 4, Jun: 5, Jul: 6, Aug: 7,
    Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };

  const parts = dateStr.split(" ");

  // Case 1: "2025 Aug"
  if (parts.length === 2) {
    const [year, month] = parts;
    return new Date(Number(year), months[month] ?? 0, 1).getTime();
  }

  // Case 2: "2025 Jul 8"
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return new Date(
      Number(year),
      months[month] ?? 0,
      Number(day)
    ).getTime();
  }

  return 0;
};

const sortArticles = (articlesToSort) => {
  if (sortBy === "publication") {
    return [...articlesToSort].sort((a, b) => {
      const dateA = parseDateSafe(a.publication_date);
      const dateB = parseDateSafe(b.publication_date);

      return dateB - dateA;
    });
  }

  if (sortBy === "recent") {
    return [...articlesToSort].sort((a, b) => b.id - a.id);
  }

  return articlesToSort;
};
    const filteredArticles = articles.filter((article) => {
    const query = searchQuery.toLowerCase();

    const titleMatch = article.title?.toLowerCase().includes(query);
    const summaryMatch = article.summary?.toLowerCase().includes(query);
    const innerTextMatch = article.innertext?.toLowerCase().includes(query);
    const authorsMatch = article.authors?.join(" ").toLowerCase().includes(query);

    return titleMatch || summaryMatch || innerTextMatch || authorsMatch;
});

    const sortedArticles = sortArticles(filteredArticles);

    console.log(sortedArticles);

    return (
        <div className={`article-search-page ${isHS ? "hs-mode" : ""}`}>
            {/* ---------- NAVBAR ---------- */}
            <Navbar />

            {/* ---------- HEADER (HS-only gradient) ---------- */}
            {isHS && (
                <div className="hs-header text-center text-white py-12">
                    <h1 className="text-3xl md:text-4xl font-bold tracking-wide">
                        Simplified Research Summaries
                    </h1>
                    <p className="text-lg opacity-90 mt-2">
                        Expert-certified and simplified insights into HS
                        research
                    </p>
                </div>
            )}

            {/* ---------- PATIENT VIEW: summaries live on the partner site ---------- */}
            {patientExternalView ? (
                <ExternalArticlesNotice variant="full" />
            ) : (
            <>
            {/* ---------- SEARCH SECTION ---------- */}
            <div className="article-search-page__content padding">
                <div className="boxed article-search-page__boxed">
                    {/* Staff: outbound partner link pinned to the corner */}
                    {tenant.articlesExternalUrl && (
                        <ExternalArticlesNotice variant="corner" />
                    )}
                    <div
                        className={`search-bar-container ${
                            isHS ? "hs-search-bar" : ""
                        } max-w-[800px] mx-auto mt-10 mb-24`}
                    >
                        <SearchArticles />
                    </div>

                    {/* ---------- SORT CONTROLS ---------- */}
                    {!loading && !error && articles.length > 0 && (
                        <div className="article-search-page__sort-controls mb-8">
                            <Select value={sortBy} onValueChange={setSortBy}>
                                <SelectTrigger className="article-search-page__select">
                                    <SelectValue placeholder="Sort by..." />
                                </SelectTrigger>
                                <SelectContent className="article-search-page__select-content">
                                    <SelectItem
                                        className="article-search-page__select-item"
                                        value="recent"
                                    >
                                        Recently Added
                                    </SelectItem>
                                    <SelectItem
                                        className="article-search-page__select-item"
                                        value="publication"
                                    >
                                        Publication Date
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* ---------- MAIN CONTENT ---------- */}
                    {loading ? (
                        <div className="article-search-page__loading">
                            {[...Array(6)].map((_, index) => (
                                <ArticleCardSkeleton key={index} />
                            ))}
                        </div>
                    ) : error ? (
                        <div className="article-search-page__error">
                            <Unplug className="article-search-page__error__icon" />
                            <p className="body-large">
                                Something went wrong. Please try again later.
                            </p>
                        </div>
                    ) : (
                        <ArticlesListPaginated
                            articles={sortedArticles}
                            articlesPerPage={6}
                        />
                    )}
                </div>
            </div>
            </>
            )}

            <Footer />
        </div>
    );
};

export default ArticleSearchPage;
