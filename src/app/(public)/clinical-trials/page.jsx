"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar/Navbar";
import Footer from "@/components/Footer/Footer";
import { Unplug, BadgeCheck, Sparkles } from "lucide-react";
import { ArticleCardSkeleton } from "@/components/ArticleCardSkeleton/ArticleCardSkeleton";
import SearchClinical from "@/components/SearchClinical/SearchClinical";
import TrialsListPaginated from "@/components/TrialsListPaginated/TrialsListPaginated";
import useSearchStore from "@/store/useSearchStore";
import { tenant } from "@/lib/config";
import "./ClinicalTrialsPage.scss";

const CONTINENT_MAP = {
  "united states": "north_america",
  canada: "north_america",
  mexico: "north_america",
  brazil: "south_america",
  argentina: "south_america",
  germany: "europe",
  france: "europe",
  italy: "europe",
  "united kingdom": "europe",
  china: "asia",
  japan: "asia",
  india: "asia",
  australia: "australia",
};

const ClinicalTrialsPage = () => {
  const router = useRouter();
  // Scleroderma and HS don't use the Clinical Trials feature — send visitors home.
  const trialsDisabled =
    tenant.shortName === "Scleroderma" || tenant.shortName === "HS";

  const { searchQuery, semanticResults = [], semanticLoading } = useSearchStore();
  const [tab, setTab] = useState("recruiting"); // recruiting | completed
  const [recruitingTrials, setRecruitingTrials] = useState([]);
  const [completedTrials, setCompletedTrials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completedLoading, setCompletedLoading] = useState(false);
  const [error, setError] = useState(false);

  // FILTER STATES
  const [ageFilter, setAgeFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [trialTypeFilter, setTrialTypeFilter] = useState("all");

  // Tenants with the trials feature disabled (Scleroderma) are redirected home.
  useEffect(() => {
    if (trialsDisabled) router.replace("/");
  }, [trialsDisabled, router]);

  // Fetch recruiting trials on mount
  useEffect(() => {
    if (trialsDisabled) return;
    (async () => {
      try {
        const res = await fetch("/api/clinical-trials/active");
        const data = await res.json();
        setRecruitingTrials(data.trials || []);
      } catch (err) {
        console.error("[Clinical Trials] Fetch failed:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [trialsDisabled]);

  // Fetch completed trials when tab switches
  useEffect(() => {
    if (tab !== "completed" || completedTrials.length > 0) return;
    (async () => {
      setCompletedLoading(true);
      try {
        const res = await fetch("/api/clinical-trials/completed");
        const data = await res.json();
        setCompletedTrials(data.trials || []);
      } catch (err) {
        console.error("[Completed Trials] Fetch failed:", err);
      } finally {
        setCompletedLoading(false);
      }
    })();
  }, [tab, completedTrials.length]);

  // Are we in semantic-search mode?
  const semanticActive = semanticResults && semanticResults.length > 0;

  // The active list for the current tab
  const baseTrials = tab === "recruiting" ? recruitingTrials : completedTrials;

  // 🔹 Apply substring + filter logic (only when NOT in semantic mode)
  const filteredTrials = useMemo(() => {
    // Semantic results bypass client-side filters
    if (semanticActive) return semanticResults;

    return baseTrials.filter((trial) => {
      const matchesSearch =
        !searchQuery ||
        trial.ai_summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trial.short_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trial.nct_id?.toLowerCase().includes(searchQuery.toLowerCase());

      const minAgeNum = trial.min_age ? parseInt(trial.min_age) : null;
      const matchesAge =
        ageFilter === "all" ||
        (ageFilter === "children" && minAgeNum !== null && minAgeNum < 18) ||
        (ageFilter === "adults" && minAgeNum !== null && minAgeNum >= 18);

      const matchesLocation =
        locationFilter === "all" ||
        trial.locations?.some((loc) => {
          const continent = CONTINENT_MAP[loc.country?.toLowerCase()] || "other";
          return continent === locationFilter;
        });

      const type = trial.study_type;
      const matchesTrialType =
        trialTypeFilter === "all" ||
        (trialTypeFilter === "interventional" && type === "interventional") ||
        (trialTypeFilter === "observational" && type === "observational") ||
        (trialTypeFilter === "expanded" && type === "expanded access");

      return matchesSearch && matchesAge && matchesLocation && matchesTrialType;
    });
  }, [baseTrials, semanticActive, semanticResults, searchQuery, ageFilter, locationFilter, trialTypeFilter]);

  // Split into verified/unverified for recruiting tab
  const verifiedTrials = filteredTrials.filter((t) => t.verified_by);
  const unverifiedTrials = filteredTrials.filter((t) => !t.verified_by);

  const isLoading = tab === "recruiting" ? loading : completedLoading;

  // Feature disabled for this tenant — render nothing while redirecting home.
  if (trialsDisabled) return null;

  return (
    <div className="clinical-trials-page">
      <Navbar />

      <div className="clinical-trials-page__content">
        <div className="boxed">
          {/* ---------- HEADER ---------- */}
          <div className="clinical-trials-page__header">
            <h1 className="clinical-trials-page__title">Clinical Studies & Trials</h1>
            <p className="clinical-trials-page__subtitle">
              Patient-friendly summaries of {tab === "recruiting" ? "currently recruiting" : "completed"} clinical research.
            </p>
            {tab === "recruiting" && unverifiedTrials.length > 0 && (
              <p className="clinical-trials-page__disclaimer">
                ⚠️ Trials without a verification badge have not yet been verified by a researcher on the original study team.
              </p>
            )}
          </div>

          {/* ---------- TABS ---------- */}
          <div className="clinical-trials-page__tabs">
            <button
              className={`clinical-trials-page__tab${tab === "recruiting" ? " clinical-trials-page__tab--active" : ""}`}
              onClick={() => setTab("recruiting")}
            >
              Recruiting
              {recruitingTrials.length > 0 && (
                <span className="clinical-trials-page__tab-count">{recruitingTrials.length}</span>
              )}
            </button>
            <button
              className={`clinical-trials-page__tab${tab === "completed" ? " clinical-trials-page__tab--active" : ""}`}
              onClick={() => setTab("completed")}
            >
              Completed Studies
              {completedTrials.length > 0 && (
                <span className="clinical-trials-page__tab-count">{completedTrials.length}</span>
              )}
            </button>
          </div>

          {/* ---------- SEARCH ---------- */}
          <div className="clinical-trials-page__search">
            <SearchClinical placeholder="Search trials or describe your situation…" />
            {semanticActive && (
              <p className="clinical-trials-page__semantic-hint">
                <Sparkles size={14} /> Semantic search active — showing best matches ranked by relevance.
                Manual filters are disabled.
              </p>
            )}
            {semanticLoading && (
              <p className="clinical-trials-page__semantic-hint">
                <Sparkles size={14} /> Finding best matches…
              </p>
            )}
          </div>

          {/* ---------- FILTERS ---------- */}
          <div className={`clinical-trials-page__filters${semanticActive ? " clinical-trials-page__filters--disabled" : ""}`}>
            <div className="filter-group">
              <label>Age</label>
              <select
                value={ageFilter}
                onChange={(e) => setAgeFilter(e.target.value)}
                disabled={semanticActive}
              >
                <option value="all">All Ages</option>
                <option value="children">Children</option>
                <option value="adults">Adults</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Location</label>
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                disabled={semanticActive}
              >
                <option value="all">All Locations</option>
                <option value="north_america">North America</option>
                <option value="south_america">South America</option>
                <option value="europe">Europe</option>
                <option value="asia">Asia</option>
                <option value="australia">Australia</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Trial Type</label>
              <select
                value={trialTypeFilter}
                onChange={(e) => setTrialTypeFilter(e.target.value)}
                disabled={semanticActive}
              >
                <option value="all">All Types</option>
                <option value="interventional">Interventional</option>
                <option value="observational">Observational</option>
                <option value="expanded">Expanded Access</option>
              </select>
            </div>
          </div>

          {/* ---------- CONTENT ---------- */}
          {isLoading ? (
            <div className="clinical-trials-page__grid">
              {[...Array(6)].map((_, i) => (
                <ArticleCardSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="clinical-trials-page__error">
              <Unplug />
              <p>Failed to load trials</p>
            </div>
          ) : filteredTrials.length === 0 ? (
            <div className="clinical-trials-page__empty">
              {tab === "recruiting" ? "No clinical trials found" : "No completed studies yet"}
            </div>
          ) : semanticActive ? (
            // Semantic mode: single ranked list
            <TrialsListPaginated trials={filteredTrials} trialsPerPage={6} />
          ) : tab === "recruiting" && verifiedTrials.length > 0 ? (
            // Two-section mode: verified at top, then unverified
            <>
              <div className="clinical-trials-page__section">
                <h2 className="clinical-trials-page__section-title">
                  <BadgeCheck size={20} /> Verified Trials
                  <span className="clinical-trials-page__section-count">({verifiedTrials.length})</span>
                </h2>
                <p className="clinical-trials-page__section-subtitle">
                  Reviewed and verified by a researcher on the original study team.
                </p>
                <TrialsListPaginated trials={verifiedTrials} trialsPerPage={6} />
              </div>
              {unverifiedTrials.length > 0 && (
                <div className="clinical-trials-page__section">
                  <h2 className="clinical-trials-page__section-title clinical-trials-page__section-title--secondary">
                    Other Trials
                    <span className="clinical-trials-page__section-count">({unverifiedTrials.length})</span>
                  </h2>
                  <p className="clinical-trials-page__section-subtitle">
                    Not yet verified by a study-team researcher.
                  </p>
                  <TrialsListPaginated trials={unverifiedTrials} trialsPerPage={6} />
                </div>
              )}
            </>
          ) : (
            // Single-list mode (completed tab or no verified trials)
            <TrialsListPaginated trials={filteredTrials} trialsPerPage={6} />
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ClinicalTrialsPage;
