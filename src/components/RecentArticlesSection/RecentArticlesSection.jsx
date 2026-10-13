"use client";
import { useEffect, useMemo, useState } from "react";
import ArticlesSection from "../ArticlesSection/ArticlesSection";
import useSearchStore from "@/store/useSearchStore";
import { useArticleLanguage } from "@/hooks/useArticleLanguage";
import { useTranslationOverlay, applyTranslationOverlay } from "@/hooks/useTranslationOverlay";
import { useUiText } from "@/hooks/useUiText";

// Keep in sync with the /articles page, which paginates 6 per page — this is
// both how many we preview here and the page-size that decides whether a
// "More Articles" (page 2) link is worth showing.
const ARTICLES_PER_PAGE = 6;

const RecentArticlesSection = () => {
  const { searchQuery } = useSearchStore();
  const t = useUiText();

  const [allArticles, setAllArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Reader's language (NF): cards switch to stored translations where they exist.
  const { language, ready } = useArticleLanguage();
  const { overlay, loading: translationsLoading } = useTranslationOverlay(language, ready);
  const shownArticles = useMemo(
    () => applyTranslationOverlay(allArticles, overlay, language),
    [allArticles, overlay, language]
  );

  // Fetch ALL articles once
  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const response = await fetch("/api/articles");
        if (!response.ok) throw new Error("Failed to fetch articles");

        const data = await response.json();
        setAllArticles(data); // the effect below derives the visible page
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

  // The visible page: newest first, narrowed by the home search box.
  const articles = useMemo(() => {
    if (!searchQuery) return shownArticles.slice(0, ARTICLES_PER_PAGE);

    const filtered = shownArticles.filter((article) =>
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

    return filtered.slice(0, ARTICLES_PER_PAGE);
  }, [searchQuery, shownArticles]);

  return (
    <ArticlesSection
      articles={articles}
      loading={loading || translationsLoading}
      error={error}
      sectionTitle={t("Recently Added Articles")}
      viewAllHref="/articles"
      // The home page shows the first 6 articles, and /articles paginates 6 per
      // page — so a page 2 exists only when the site has more than 6 articles.
      moreHref="/articles?page=2"
      showMore={allArticles.length > ARTICLES_PER_PAGE}
    />
  );
};

export default RecentArticlesSection;