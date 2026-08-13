"use client";
import { useEffect, useState } from "react";
import ArticlesSection from "../ArticlesSection/ArticlesSection";
import useSearchStore from "@/store/useSearchStore";

// Keep in sync with the /articles page, which paginates 6 per page — this is
// both how many we preview here and the page-size that decides whether a
// "More Articles" (page 2) link is worth showing.
const ARTICLES_PER_PAGE = 6;

const RecentArticlesSection = () => {
  const { searchQuery } = useSearchStore();

  const [allArticles, setAllArticles] = useState([]);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Fetch ALL articles once
  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const response = await fetch("/api/articles");
        if (!response.ok) throw new Error("Failed to fetch articles");

        const data = await response.json();
        setAllArticles(data);
        setArticles(data.slice(0, ARTICLES_PER_PAGE)); // initial page
        setError(false);
      } catch (error) {
        console.error("Error fetching articles:", error);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, []);

  // React to search input
  useEffect(() => {
    if (!searchQuery) {
      setArticles(allArticles.slice(0, ARTICLES_PER_PAGE));
      return;
    }

    const filtered = allArticles.filter((article) =>
      (
        article.title +
        " " +
        article.summary +
        " " +
        article.long_summary +
        " " +
        article.authors
      )
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase())
    );

    setArticles(filtered.slice(0, ARTICLES_PER_PAGE));
  }, [searchQuery, allArticles]);

  return (
    <ArticlesSection
      articles={articles}
      loading={loading}
      error={error}
      sectionTitle={"Recently Added Articles"}
      viewAllHref="/articles"
      // The home page shows the first 6 articles, and /articles paginates 6 per
      // page — so a page 2 exists only when the site has more than 6 articles.
      moreHref="/articles?page=2"
      showMore={allArticles.length > ARTICLES_PER_PAGE}
    />
  );
};

export default RecentArticlesSection;