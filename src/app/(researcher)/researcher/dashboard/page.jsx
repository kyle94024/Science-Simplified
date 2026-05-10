"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar/Navbar";
import Footer from "@/components/Footer/Footer";
import { withResearcherAuth } from "@/components/withResearcherAuth/withResearcherAuth";
import { BadgeCheck, ChevronRight, Archive } from "lucide-react";
import "./ResearcherDashboard.scss";

function ResearcherDashboard() {
  const [trials, setTrials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/researcher/assigned-trials");
        const data = await res.json();
        setTrials(data.trials || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <>
      <Navbar />

      <main className="researcher-dashboard">
        <div className="researcher-dashboard__container">
          <header>
            <h1>Researcher Dashboard</h1>
            <p>Trials assigned to you for review, editing, and verification.</p>
          </header>

          {loading ? (
            <p className="researcher-dashboard__loading">Loading…</p>
          ) : trials.length === 0 ? (
            <div className="researcher-dashboard__empty">
              <p>No trials assigned yet.</p>
              <p>An admin will assign trials to you. Check back later.</p>
            </div>
          ) : (
            <ul className="researcher-dashboard__list">
              {trials.map((t) => {
                const isVerified = !!t.verified_by;
                const isCompleted = t.archive_reason === "completed";
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
                          {!isVerified && !isCompleted && (
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
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}

export default withResearcherAuth(ResearcherDashboard);
