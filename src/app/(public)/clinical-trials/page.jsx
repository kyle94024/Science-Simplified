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
import { matchesQuery } from "@/lib/clinicalTrials/searchVocabulary";
import { useUiText } from "@/hooks/useUiText";
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
  const t = useUiText();
  // Tenants with tenant.hideClinicalTrials don't use the feature — send visitors home.
  const trialsDisabled = !!tenant.hideClinicalTrials;

  const { searchQuery, semanticResults = [], semanticLoading } = useSearchStore();
  // Public page lists recruiting trials only — the "Completed Studies" tab was removed.
  const tab = "recruiting";
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

  // The active list for the current tab
  const baseTrials = tab === "recruiting" ? recruitingTrials : completedTrials;

  const tenantKey = (tenant.shortName || "").toUpperCase();
  const searching = (searchQuery || "").trim().length > 0;
  // Semantic results exist only for longer descriptions (see SearchClinical) and
  // are already trimmed to genuine matches server-side; they extend, never
  // replace, the keyword matches.
  const semanticActive = searching && semanticResults.length > 0;

  const filteredTrials = useMemo(() => {
    // 1. Keyword matches first — on the trial's own vocabulary (official title,
    //    acronym, conditions, keywords, plus known synonyms such as NF2-SWN), not
    //    just the patient-friendly rewrite. Then any semantic matches the
    //    keywords didn't catch, in relevance order.
    let candidates = baseTrials;
    if (searching) {
      const keywordMatches = baseTrials.filter((trial) => matchesQuery(trial, searchQuery, tenantKey));
      const seen = new Set(keywordMatches.map((trial) => trial.nct_id));
      candidates = [...keywordMatches, ...semanticResults.filter((trial) => !seen.has(trial.nct_id))];
    }

    // 2. The manual filters apply to everything, semantic matches included.
    return candidates.filter((trial) => {
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
        // The API sends ClinicalTrials.gov's "EXPANDED_ACCESS" lowercased.
        (trialTypeFilter === "expanded" && (type === "expanded_access" || type === "expanded access"));

      return matchesAge && matchesLocation && matchesTrialType;
    });
  }, [baseTrials, searching, searchQuery, semanticResults, tenantKey, ageFilter, locationFilter, trialTypeFilter]);

  // Split into verified/unverified for recruiting tab
  const verifiedTrials = filteredTrials.filter((trial) => trial.verified_by);
  const unverifiedTrials = filteredTrials.filter((trial) => !trial.verified_by);

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
            <h1 className="clinical-trials-page__title">{t("Clinical Studies & Trials")}</h1>
            <p className="clinical-trials-page__subtitle">
              {tab === "recruiting"
                ? t("Patient-friendly summaries of currently recruiting clinical research.")
                : t("Patient-friendly summaries of completed clinical research.")}
            </p>
            {tab === "recruiting" && unverifiedTrials.length > 0 && (
              <p className="clinical-trials-page__disclaimer">
                ⚠️ {t("Trials without a verification badge have not yet been reviewed and verified by an editor.")}
              </p>
            )}
          </div>

          {/* ---------- SEARCH ---------- */}
          <div className="clinical-trials-page__search">
            <SearchClinical placeholder={t("Search trials or describe your situation…")} />
            {semanticActive && (
              <p className="clinical-trials-page__semantic-hint">
                <Sparkles size={14} /> {t("Also showing the closest matches for your description, ranked by relevance.")}
              </p>
            )}
            {semanticLoading && (
              <p className="clinical-trials-page__semantic-hint">
                <Sparkles size={14} /> {t("Finding best matches…")}
              </p>
            )}
          </div>

          {/* ---------- FILTERS ---------- */}
          <div className="clinical-trials-page__filters">
            <div className="filter-group">
              <label>{t("Age")}</label>
              <select
                value={ageFilter}
                onChange={(e) => setAgeFilter(e.target.value)}
              >
                <option value="all">{t("All Ages")}</option>
                <option value="children">{t("Children")}</option>
                <option value="adults">{t("Adults")}</option>
              </select>
            </div>

            <div className="filter-group">
              <label>{t("Location")}</label>
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
              >
                <option value="all">{t("All Locations")}</option>
                <option value="north_america">{t("North America")}</option>
                <option value="south_america">{t("South America")}</option>
                <option value="europe">{t("Europe")}</option>
                <option value="asia">{t("Asia")}</option>
                <option value="australia">{t("Australia")}</option>
                <option value="other">{t("Other")}</option>
              </select>
            </div>

            <div className="filter-group">
              <label>{t("Trial Type")}</label>
              <select
                value={trialTypeFilter}
                onChange={(e) => setTrialTypeFilter(e.target.value)}
              >
                <option value="all">{t("All Types")}</option>
                <option value="interventional">{t("Interventional")}</option>
                <option value="observational">{t("Observational")}</option>
                <option value="expanded">{t("Expanded Access")}</option>
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
              <p>{t("Failed to load trials")}</p>
            </div>
          ) : filteredTrials.length === 0 ? (
            <div className="clinical-trials-page__empty">
              {searching
                ? t("No trials match “{query}”. Try another word or acronym, or describe your situation in a sentence.", {
                    query: searchQuery.trim(),
                  })
                : tab === "recruiting"
                  ? t("No clinical trials found")
                  : t("No completed studies yet")}
            </div>
          ) : searching ? (
            // Search results: one list, best matches first
            <TrialsListPaginated trials={filteredTrials} trialsPerPage={6} />
          ) : tab === "recruiting" && verifiedTrials.length > 0 ? (
            // Two-section mode: verified at top, then unverified
            <>
              <div className="clinical-trials-page__section">
                <h2 className="clinical-trials-page__section-title">
                  <BadgeCheck size={20} /> {t("Verified Trials")}
                  <span className="clinical-trials-page__section-count">({verifiedTrials.length})</span>
                </h2>
                <p className="clinical-trials-page__section-subtitle">
                  {t("Reviewed and verified by a subject-matter editor.")}
                </p>
                <TrialsListPaginated trials={verifiedTrials} trialsPerPage={6} />
              </div>
              {unverifiedTrials.length > 0 && (
                <div className="clinical-trials-page__section">
                  <h2 className="clinical-trials-page__section-title clinical-trials-page__section-title--secondary">
                    {t("Other Trials")}
                    <span className="clinical-trials-page__section-count">({unverifiedTrials.length})</span>
                  </h2>
                  <p className="clinical-trials-page__section-subtitle">
                    {t("Not yet reviewed and verified by an editor.")}
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
