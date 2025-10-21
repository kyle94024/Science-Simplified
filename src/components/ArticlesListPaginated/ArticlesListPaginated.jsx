"use client";
import "./ArticlesListPaginated.scss";
import React, { useState, useEffect } from "react";
import ArticleCard from "@/components/ArticleCard/ArticleCard";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { ArticleCardSkeleton } from "@/components/ArticleCardSkeleton/ArticleCardSkeleton";
import { SearchX, Unplug, ChevronLeft, ChevronRight } from "lucide-react";
import { tenant } from "@/lib/config"; // ✅ import tenant to check NEXT_PUBLIC_SITE_KEY

export default function ArticlesListPaginated({
  articles = [],
  articlesPerPage = 6,
  loading = false,
  error = false,
  pageType = "",
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const isHS = tenant.shortName === "HS"; // ✅ key flag

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const totalPages = Math.max(1, Math.ceil(articles.length / articlesPerPage));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [articles.length, totalPages, currentPage]);

  const selectedArticles = articles.slice(
    (currentPage - 1) * articlesPerPage,
    currentPage * articlesPerPage
  );

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo(0, 0);
    }
  };

  const getPaginationItems = () => {
    const pages = [];
    if (isMobile) {
      if (currentPage > 2) pages.push(1, "...");
      if (currentPage > 1) pages.push(currentPage - 1);
      pages.push(currentPage);
      if (currentPage < totalPages) pages.push(currentPage + 1);
      if (currentPage < totalPages - 1) pages.push("...", totalPages);
    } else {
      if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
      } else {
        if (currentPage <= 4)
          pages.push(1, 2, 3, 4, 5, "...", totalPages);
        else if (currentPage > totalPages - 4)
          pages.push(
            1,
            "...",
            totalPages - 4,
            totalPages - 3,
            totalPages - 2,
            totalPages - 1,
            totalPages
          );
        else
          pages.push(
            1,
            "...",
            currentPage - 1,
            currentPage,
            currentPage + 1,
            "...",
            totalPages
          );
      }
    }
    return pages;
  };

  // === STATES ===
  if (loading) {
    return (
      <div className={`article-list__loading ${isHS ? "hs-mode" : ""}`}>
        {[...Array(articlesPerPage)].map((_, index) => (
          <ArticleCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={`article-list__error ${isHS ? "hs-mode" : ""}`}>
        <Unplug className="article-list__error__icon" />
        <p className="body-large">Something went wrong. Please try again later.</p>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className={`article-list__empty-state ${isHS ? "hs-mode" : ""}`}>
        <SearchX className="article-list__empty-icon" />
        <p className="body-large">No articles found. Try a different search!</p>
      </div>
    );
  }

  // === MAIN CONTENT ===
  return (
    <div className={`article-list ${isHS ? "hs-mode" : ""}`}>
      <div className="article-list__items">
        {selectedArticles.map((article) => {
          let authorName =
            article.name ||
            article.publisher_name ||
            (article.certifiedby ? "Anonymous" : "Anonymous");

          return (
            <ArticleCard
              pageType={pageType}
              key={article.id || article.title}
              id={article.id}
              imageUrl={article.image_url}
              date={article.publication_date ?? article.date ?? ""}
              title={article.title}
              summary={article.summary}
              authorImageUrl={article.photo}
              authorName={authorName}
              authorCreds={
                article.degree && article.degree !== "No Degree"
                  ? article.degree
                  : null
              }
              authorInstitution={article.university}
            />
          );
        })}
      </div>

      {totalPages > 1 && (
        <Pagination className="pagination">
          <PaginationContent className="pagination__content">
            <PaginationItem className="pagination__item">
              {isMobile ? (
                <ChevronLeft
                  onClick={(e) => {
                    e.preventDefault();
                    handlePageChange(currentPage - 1);
                  }}
                  className="pagination__icon"
                />
              ) : (
                <PaginationPrevious
                  href="#"
                  className="pagination__previous"
                  onClick={(e) => {
                    e.preventDefault();
                    handlePageChange(currentPage - 1);
                  }}
                />
              )}
            </PaginationItem>

            {getPaginationItems().map((item, index) =>
              item === "..." ? (
                <PaginationItem key={index} className="pagination__item">
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={index} className="pagination__item">
                  <PaginationLink
                    href="#"
                    isActive={currentPage === item}
                    className={`pagination__link ${
                      currentPage === item ? "pagination__link--active" : ""
                    } ${isHS ? "hs-pagination-link" : ""}`}
                    onClick={(e) => {
                      e.preventDefault();
                      handlePageChange(item);
                    }}
                  >
                    {item}
                  </PaginationLink>
                </PaginationItem>
              )
            )}

            <PaginationItem className="pagination__item">
              {isMobile ? (
                <ChevronRight
                  onClick={(e) => {
                    e.preventDefault();
                    handlePageChange(currentPage + 1);
                  }}
                  className="pagination__icon"
                />
              ) : (
                <PaginationNext
                  href="#"
                  className="pagination__next"
                  onClick={(e) => {
                    e.preventDefault();
                    handlePageChange(currentPage + 1);
                  }}
                />
              )}
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
