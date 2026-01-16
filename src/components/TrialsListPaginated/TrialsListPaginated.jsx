"use client";
import "./TrialsListPaginated.scss";
import { useState, useEffect } from "react";
import TrialCard from "@/components/TrialCard/TrialCard";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { SearchX, Unplug, ChevronLeft, ChevronRight } from "lucide-react";

export default function TrialsListPaginated({
  trials = [],
  trialsPerPage = 6,
  loading = false,
  error = false,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobile, setIsMobile] = useState(false);

  /* ---------- RESPONSIVE ---------- */
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const totalPages = Math.max(1, Math.ceil(trials.length / trialsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [trials.length, totalPages, currentPage]);

  const selectedTrials = trials.slice(
    (currentPage - 1) * trialsPerPage,
    currentPage * trialsPerPage
  );

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  /* ---------- PAGINATION LOGIC (SAME AS ARTICLES) ---------- */
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
        if (currentPage <= 4) {
          pages.push(1, 2, 3, 4, 5, "...", totalPages);
        } else if (currentPage > totalPages - 4) {
          pages.push(
            1,
            "...",
            totalPages - 4,
            totalPages - 3,
            totalPages - 2,
            totalPages - 1,
            totalPages
          );
        } else {
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
    }

    return pages;
  };

  /* ---------- STATES ---------- */
  if (loading) {
    return <p>Loading trials…</p>;
  }

  if (error) {
    return (
      <div className="trial-list__error">
        <Unplug />
        <p>Something went wrong. Please try again later.</p>
      </div>
    );
  }

  if (trials.length === 0) {
    return (
      <div className="trial-list__empty-state">
        <SearchX />
        <p>No clinical trials found.</p>
      </div>
    );
  }

  /* ---------- MAIN ---------- */
  return (
    <div className="trial-list">
      <div className="trial-list__items">
        {selectedTrials.map((trial) => (
          <TrialCard key={trial.nct_id} trial={trial} />
        ))}
      </div>

      {totalPages > 1 && (
        <Pagination className="pagination">
          <PaginationContent className="pagination__content">
            <PaginationItem className="pagination__item">
              {isMobile ? (
                <ChevronLeft
                  className="pagination__icon"
                  onClick={() => handlePageChange(currentPage - 1)}
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
                    }`}
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
                  className="pagination__icon"
                  onClick={() => handlePageChange(currentPage + 1)}
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
