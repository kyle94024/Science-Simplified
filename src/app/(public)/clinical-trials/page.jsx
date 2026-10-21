"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar/Navbar";
import Footer from "@/components/Footer/Footer";
import { Unplug, BadgeCheck, Sparkles, X } from "lucide-react";
import { TrialCardSkeleton } from "@/components/TrialCard/TrialCard";
import SearchClinical from "@/components/SearchClinical/SearchClinical";
import TrialsListPaginated from "@/components/TrialsListPaginated/TrialsListPaginated";
import useSearchStore from "@/store/useSearchStore";
import { tenant } from "@/lib/config";
import { matchesQuery } from "@/lib/clinicalTrials/searchVocabulary";
import { useUiText } from "@/hooks/useUiText";
import { uiText } from "@/lib/uiText";
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

// Quick topics above the list, per tenant (TENANT_CONFIG key). Each runs
// through the same keyword matching as the search box, synonyms included
// (src/lib/clinicalTrials/searchVocabulary.js). Topics with no trials are hidden.
const TOPICS = {
  NF: [
    { label: uiText("NF1"), query: "nf1" },
    { label: uiText("NF2-SWN"), query: "nf2-swn" },
    { label: uiText("Schwannomatosis"), query: "schwannomatosis" },
    { label: uiText("Plexiform neurofibromas"), query: "plexiform neurofibroma" },
    { label: uiText("Cutaneous neurofibromas"), query: "cutaneous neurofibroma" },
    { label: uiText("MPNST"), query: "mpnst" },
    { label: uiText("Optic pathway glioma"), query: "optic pathway glioma" },
  ],
};

const ClinicalTrialsPage = () => {
  const router = useRouter();
  const t = useUiText();
  // Tenants with tenant.hideClinicalTrials don't use the feature — send visitors home.
  const trialsDisabled = !!tenant.hideClinicalTrials;

  const { searchQuery, setSearchQuery, semanticResults = [], semanticLoading, clearSemantic } = useSearchStore();
  // Public page lists recruiting trials only — the "Completed Studies" tab was removed.
  const tab = "recruiting";
  const [recruitingTrials, setRecruitingTrials] = useState([]);
  const [completedTrials, setCompletedTrials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completedLoading, setCompletedLoading] = useState(false);
  const [error, setError] = useState(false);

  // FILTER STATES
  const [topic, setTopic] = useState(null);
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
  const filtersActive = ageFilter !== "all" || locationFilter !== "all" || trialTypeFilter !== "all";
  const anyActive = searching || !!topic || filtersActive;

  // Search + filters, before the topic chips — what the topic counts are taken from.
  const contextTrials = useMemo(() => {
    // 1. Keyword matches first — on the trial's own vocabulary (official title,
    //    acronym, conditions, keywords, who runs it, plus known synonyms such as
    //    NF2-SWN), not just the patient-friendly rewrite. Then any semantic
    //    matches the keywords didn't catch, in relevance order.
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

  // 3. Topic chip, if one is picked.
  const filteredTrials = useMemo(
    () => (topic ? contextTrials.filter((trial) => matchesQuery(trial, topic, tenantKey)) : contextTrials),
    [contextTrials, topic, tenantKey]
  );

  // Topics this tenant has trials for, with how many match the current search/filters.
  const topics = useMemo(
    () =>
      (TOPICS[tenantKey] || [])
        .filter((tp) => baseTrials.some((trial) => matchesQuery(trial, tp.query, tenantKey)))
        .map((tp) => ({ ...tp, count: contextTrials.filter((trial) => matchesQuery(trial, tp.query, tenantKey)).length })),
    [tenantKey, baseTrials, contextTrials]
  );

  // Split into verified/unverified for recruiting tab
  const verifiedTrials = filteredTrials.filter((trial) => trial.verified_by);
  const unverifiedTrials = filteredTrials.filter((trial) => !trial.verified_by);

  const isLoading = tab === "recruiting" ? loading : completedLoading;
  const listKey = [searchQuery, topic, ageFilter, locationFilter, trialTypeFilter, semanticResults.length].join("|");

  const clearAll = () => {
    setSearchQuery("");
    clearSemantic();
    setTopic(null);
    setAgeFilter("all");
    setLocationFilter("all");
    setTrialTypeFilter("all");
  };

  // Feature disabled for this tenant — render nothing while redirecting home.
  if (trialsDisabled) return null;

  const total = baseTrials.length;
  const countText = anyActive
    ? t("{count} of {total} recruiting trials", { count: filteredTrials.length, total })
    : total === 1
      ? t("1 recruiting trial")
      : t("{count} recruiting trials", { count: total });

  const filterSelect = (label, value, onChange, options) => (
    <label className={`trials-filter${value !== "all" ? " trials-filter--set" : ""}`}>
      <span className="trials-filter__label">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, text]) => (
          <option key={v} value={v}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="clinical-trials-page">
      <Navbar />

      <main className="clinical-trials-page__content">
        <div className="clinical-trials-page__inner">
          {/* ---------- HEADER ---------- */}
          <header className="clinical-trials-page__header">
            <h1 className="clinical-trials-page__title">{t("Clinical Studies & Trials")}</h1>
            <p className="clinical-trials-page__subtitle">
              {tab === "recruiting"
                ? t("Patient-friendly summaries of currently recruiting clinical research.")
                : t("Patient-friendly summaries of completed clinical research.")}
            </p>
          </header>

          {/* ---------- SEARCH + TOPICS + FILTERS ---------- */}
          <section className="clinical-trials-page__panel">
            <SearchClinical placeholder={t("Search trials or describe your situation…")} />

            {topics.length > 0 && (
              <div className="trials-topics" role="group" aria-label={t("Topics")}>
                <button
                  type="button"
                  className="trials-topic"
                  aria-pressed={!topic}
                  onClick={() => setTopic(null)}
                >
                  {t("All topics")}
                </button>
                {topics.map((tp) => (
                  <button
                    key={tp.query}
                    type="button"
                    className="trials-topic"
                    aria-pressed={topic === tp.query}
                    disabled={tp.count === 0 && topic !== tp.query}
                    onClick={() => setTopic(topic === tp.query ? null : tp.query)}
                  >
                    {t(tp.label)}
                    <span className="trials-topic__count">{tp.count}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="clinical-trials-page__filters">
              {filterSelect(t("Age"), ageFilter, setAgeFilter, [
                ["all", t("All Ages")],
                ["children", t("Children")],
                ["adults", t("Adults")],
              ])}
              {filterSelect(t("Location"), locationFilter, setLocationFilter, [
                ["all", t("All Locations")],
                ["north_america", t("North America")],
                ["south_america", t("South America")],
                ["europe", t("Europe")],
                ["asia", t("Asia")],
                ["australia", t("Australia")],
                ["other", t("Other")],
              ])}
              {filterSelect(t("Trial Type"), trialTypeFilter, setTrialTypeFilter, [
                ["all", t("All Types")],
                ["interventional", t("Interventional")],
                ["observational", t("Observational")],
                ["expanded", t("Expanded Access")],
              ])}
            </div>
          </section>

          {/* ---------- RESULTS BAR ---------- */}
          {!isLoading && !error && (
            <div className="clinical-trials-page__results-bar">
              <p className="clinical-trials-page__count" aria-live="polite">
                {countText}
                {semanticLoading ? (
                  <span className="clinical-trials-page__semantic-hint">
                    <Sparkles size={14} /> {t("Finding best matches…")}
                  </span>
                ) : (
                  semanticActive && (
                    <span className="clinical-trials-page__semantic-hint">
                      <Sparkles size={14} /> {t("Also showing the closest matches for your description, ranked by relevance.")}
                    </span>
                  )
                )}
              </p>
              {anyActive && (
                <button type="button" className="clinical-trials-page__clear" onClick={clearAll}>
                  <X size={15} aria-hidden="true" />
                  {t("Clear all")}
                </button>
              )}
            </div>
          )}

          {tab === "recruiting" && unverifiedTrials.length > 0 && (
            <p className="clinical-trials-page__disclaimer">
              ⚠️ {t("Trials without a verification badge have not yet been reviewed and verified by an editor.")}
            </p>
          )}

          {/* ---------- CONTENT ---------- */}
          {isLoading ? (
            <div className="trial-list__items">
              {[...Array(4)].map((_, i) => (
                <TrialCardSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="clinical-trials-page__error">
              <Unplug />
              <p>{t("Failed to load trials")}</p>
            </div>
          ) : filteredTrials.length === 0 ? (
            <div className="clinical-trials-page__empty">
              <p>
                {searching
                  ? t("No trials match “{query}”. Try another word or acronym, or describe your situation in a sentence.", {
                      query: searchQuery.trim(),
                    })
                  : anyActive
                    ? t("No trials match these filters.")
                    : tab === "recruiting"
                      ? t("No clinical trials found")
                      : t("No completed studies yet")}
              </p>
              {anyActive && (
                <button type="button" className="clinical-trials-page__clear" onClick={clearAll}>
                  <X size={15} aria-hidden="true" />
                  {t("Clear all")}
                </button>
              )}
            </div>
          ) : searching ? (
            // Search results: one list, best matches first
            <TrialsListPaginated trials={filteredTrials} resetKey={listKey} />
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
                <TrialsListPaginated trials={verifiedTrials} resetKey={listKey} />
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
                  <TrialsListPaginated trials={unverifiedTrials} resetKey={listKey} />
                </div>
              )}
            </>
          ) : (
            // Single-list mode (completed tab or no verified trials)
            <TrialsListPaginated trials={filteredTrials} resetKey={listKey} />
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ClinicalTrialsPage;
