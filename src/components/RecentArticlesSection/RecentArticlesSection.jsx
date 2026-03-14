"use client";
import { useEffect, useState } from "react";
import ArticlesSection from "../ArticlesSection/ArticlesSection";
import useSearchStore from "@/store/useSearchStore";

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
        setArticles(data.slice(0, 6)); // initial 6
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
      setArticles(allArticles.slice(0, 6));
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

    setArticles(filtered.slice(0, 6));
  }, [searchQuery, allArticles]);

  return (
    <ArticlesSection
      articles={articles}
      loading={loading}
      error={error}
      sectionTitle={"Recently Added Articles"}
    />
  );
};

export default RecentArticlesSection;