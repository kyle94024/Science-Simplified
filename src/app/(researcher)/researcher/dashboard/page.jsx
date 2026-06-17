"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar/Navbar";
import Footer from "@/components/Footer/Footer";
import { withResearcherAuth } from "@/components/withResearcherAuth/withResearcherAuth";
import { BadgeCheck, ChevronRight, Archive, FileText, Microscope, AlertCircle } from "lucide-react";
import "./ResearcherDashboard.scss";

function ResearcherDashboard() {
  const [trials, setTrials] = useState([]);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("trials");

  useEffect(() => {
    (async () => {
      try {
        const [trialsRes, articlesRes] = await Promise.all([
          fetch("/api/researcher/assigned-trials").then((r) => r.json()),
          fetch("/api/researcher/assigned-articles").then((r) => r.json()),
        ]);
        setTrials(trialsRes.trials || []);
        setArticles(articlesRes.articles || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const pendingTrials = trials.filter((t) => !t.verified_by && t.archive_reason !== "completed").length;
  const pendingArticles = articles.filter((a) => !a.is_certified).length;

  return (
    <>
      <Navbar />

      <main className="researcher-dashboard">
        <div className="researcher-dashboard__container">
          <header>
            <h1>Expert Dashboard</h1>
            <p>Clinical trials and articles assigned to you for review, editing, and verification.</p>
          </header>

          {/* Stats */}
          <div className="researcher-dashboard__stats">
            <div className="researcher-dashboard__stat">
              <div className="researcher-dashboard__stat-num">{trials.length}</div>
              <div className="researcher-dashboard__stat-label">Trials assigned</div>
              {pendingTrials > 0 && (
                <div className="researcher-dashboard__stat-pending">
                  <AlertCircle size={12} /> {pendingTrials} need review
                </div>
              )}
            </div>
            <div className="researcher-dashboard__stat">
              <div className="researcher-dashboard__stat-num">{articles.length}</div>
              <div className="researcher-dashboard__stat-label">Articles assigned</div>
              {pendingArticles > 0 && (
                <div className="researcher-dashboard__stat-pending">
                  <AlertCircle size={12} /> {pendingArticles} need review
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="researcher-dashboard__tabs">
            <button
              type="button"
              className={`researcher-dashboard__tab ${activeTab === "trials" ? "researcher-dashboard__tab--active" : ""}`}
              onClick={() => setActiveTab("trials")}
            >
              <Microscope size={16} /> Clinical Trials
              {pendingTrials > 0 && (
                <span className="researcher-dashboard__tab-badge">{pendingTrials}</span>
              )}
            </button>
            <button
              type="button"
              className={`researcher-dashboard__tab ${activeTab === "articles" ? "researcher-dashboard__tab--active" : ""}`}
              onClick={() => setActiveTab("articles")}
            >
              <FileText size={16} /> Articles
              {pendingArticles > 0 && (
                <span className="researcher-dashboard__tab-badge">{pendingArticles}</span>
              )}
            </button>
          </div>

          {loading ? (
            <p className="researcher-dashboard__loading">Loading…</p>
          ) : activeTab === "trials" ? (
            trials.length === 0 ? (
              <div className="researcher-dashboard__empty">
                <p>No trials assigned yet.</p>
                <p>An admin will assign trials to you. Check back later.</p>
              </div>
            ) : (
              <ul className="researcher-dashboard__list">
                {trials.map((t) => {
                  const isVerified = !!t.verified_by;
                  const isCompleted = t.archive_reason === "completed";
                  const isSubmitted = !isVerified && t.workflow_status === "review_submitted";
                  return (
                    <li key={t.nct_id} className="researcher-dashboard__item">
                      <Link href={`/researcher/trials/${t.nct_id}`} className="researcher-dashboard__link">
                        <div className="researcher-dashboard__item-main">
                          <div className="researcher-dashboard__item-title">
                            {t.short_title || "Untitled trial"}
                          </div>
                          <div className="researcher-dashboard__item-nct">{t.nct_id}</div>
                          {t.ai_summary && (
                            <p className="researcher-dashboard__item-summary">
                              {t.ai_summary.length > 200 ? t.ai_summary.slice(0, 200) + "…" : t.ai_summary}
                            </p>
                          )}
                        </div>

                        <div className="researcher-dashboard__item-meta">
                          <div className="researcher-dashboard__badges">
                            {isVerified && (
                              <span className="researcher-dashboard__badge researcher-dashboard__badge--verified">
                                <BadgeCheck size={12} /> Verified
                              </span>
                            )}
                            {isCompleted && (
                              <span className="researcher-dashboard__badge researcher-dashboard__badge--completed">
                                <Archive size={12} /> Completed
                              </span>
                            )}
                            {isSubmitted && !isCompleted && (
                              <span className="researcher-dashboard__badge researcher-dashboard__badge--submitted">
                                Submitted for review
                              </span>
                            )}
                            {!isVerified && !isCompleted && !isSubmitted && (
                              <span className="researcher-dashboard__badge researcher-dashboard__badge--pending">
                                Needs review
                              </span>
                            )}
                          </div>
                          <ChevronRight size={20} className="researcher-dashboard__item-arrow" />
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )
          ) : articles.length === 0 ? (
            <div className="researcher-dashboard__empty">
              <p>No articles assigned yet.</p>
              <p>An admin will assign articles to you for certification. Check back later.</p>
            </div>
          ) : (
            <ul className="researcher-dashboard__list">
              {articles.map((a) => (
                <li key={a.article_id} className="researcher-dashboard__item">
                  <Link
                    href={a.is_published ? `/articles/${a.article_id}` : `/edit-article/${a.article_id}`}
                    className="researcher-dashboard__link"
                  >
                    <div className="researcher-dashboard__item-main">
                      <div className="researcher-dashboard__item-title">
                        {a.title || "Untitled article"}
                      </div>
                      <div className="researcher-dashboard__item-nct">Article #{a.article_id}</div>
                      {a.summary && (
                        <p className="researcher-dashboard__item-summary">
                          {a.summary.length > 200 ? a.summary.slice(0, 200) + "…" : a.summary}
                        </p>
                      )}
                    </div>

                    <div className="researcher-dashboard__item-meta">
                      <div className="researcher-dashboard__badges">
                        {a.is_certified ? (
                          <span className="researcher-dashboard__badge researcher-dashboard__badge--verified">
                            <BadgeCheck size={12} /> Certified
                          </span>
                        ) : a.is_published ? (
                          <span className="researcher-dashboard__badge researcher-dashboard__badge--pending">
                            Awaiting cert
                          </span>
                        ) : (
                          <span className="researcher-dashboard__badge researcher-dashboard__badge--pending">
                            Pending review
                          </span>
                        )}
                      </div>
                      <ChevronRight size={20} className="researcher-dashboard__item-arrow" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}

export default withResearcherAuth(ResearcherDashboard);
