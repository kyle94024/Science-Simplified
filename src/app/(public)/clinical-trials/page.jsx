"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar/Navbar";
import Footer from "@/components/Footer/Footer";
import { Unplug } from "lucide-react";
import { ArticleCardSkeleton } from "@/components/ArticleCardSkeleton/ArticleCardSkeleton";
import SearchClinical from "@/components/SearchClinical/searchclinical";
import TrialsListPaginated from "@/components/TrialsListPaginated/TrialsListPaginated";
import useSearchStore from "@/store/useSearchStore";
import "./ClinicalTrialsPage.scss";

const TENANT = process.env.NEXT_PUBLIC_TENANT;

const ClinicalTrialsPage = () => {
  const { searchQuery } = useSearchStore();
  const [trials, setTrials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // FILTER STATES
  const [ageFilter, setAgeFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [trialTypeFilter, setTrialTypeFilter] = useState("all");

  useEffect(() => {
    const fetchTrials = async () => {
      try {
        const res = await fetch(`/api/clinical-trials/active?tenant=${TENANT}`);
        const data = await res.json();
        setTrials(data.trials || []);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchTrials();
  }, []);

  const getTrialType = (trial) =>
    trial.raw_data?.protocolSection?.designModule?.studyType || "Unknown";

  const getLocations = (trial) =>
    trial.raw_data?.protocolSection?.contactsLocationsModule?.locations || [];

  const getAgeRange = (trial) => {
    const min = trial.raw_data?.protocolSection?.eligibilityModule?.minimumAge;
    if (!min) return "all";

    const minNum = parseInt(min);
    if (minNum < 18) return "children";
    return "adults";
  };

  // 🔹 FILTER LOGIC
  const filteredTrials = trials.filter((trial) => {
    /* ---------- SEARCH ---------- */
    const matchesSearch =
      !searchQuery ||
      trial.ai_summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trial.short_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trial.nct_id?.toLowerCase().includes(searchQuery.toLowerCase());

    /* ---------- AGE ---------- */
    const minAgeNum = trial.min_age ? parseInt(trial.min_age) : null;

    const matchesAge =
      ageFilter === "all" ||
      (ageFilter === "children" && minAgeNum !== null && minAgeNum < 18) ||
      (ageFilter === "adults" && minAgeNum !== null && minAgeNum >= 18);

    /* ---------- LOCATION ---------- */
    const country = trial.location_country?.toLowerCase();

    const matchesLocation =
      locationFilter === "all" ||
      (locationFilter === "us" && country === "united states") ||
      (locationFilter === "canada" && country === "canada") ||
      (locationFilter === "other" &&
        country &&
        country !== "united states" &&
        country !== "canada");

    /* ---------- TRIAL TYPE ---------- */
    const type = trial.study_type; // already lowercase from API

    const matchesTrialType =
      trialTypeFilter === "all" ||
      (trialTypeFilter === "interventional" && type === "interventional") ||
      (trialTypeFilter === "observational" && type === "observational") ||
      (trialTypeFilter === "expanded" && type === "expanded access");

    return matchesSearch && matchesAge && matchesLocation && matchesTrialType;
  });
  return (
    <div className="clinical-trials-page">
      <Navbar />

      <div className="clinical-trials-page__content">
        <div className="boxed">
          {/* ---------- HEADER ---------- */}
          <div className="clinical-trials-page__header">
            <h1 className="clinical-trials-page__title">
              Get Involved in Clinical Research
            </h1>
            <p className="clinical-trials-page__subtitle">
              Summaries of currently recruiting clinical trials
            </p>
          </div>

          {/* ---------- SEARCH ---------- */}
          <div className="clinical-trials-page__search">
            <SearchClinical placeholder="Search clinical trials…" />
          </div>

          {/* ---------- FILTERS ---------- */}
          <div className="clinical-trials-page__filters">
            <div className="filter-group">
              <label>Age</label>
              <select
                value={ageFilter}
                onChange={(e) => setAgeFilter(e.target.value)}
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
              >
                <option value="all">All Locations</option>
                <option value="us">United States</option>
                <option value="canada">Canada</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Trial Type</label>
              <select
                value={trialTypeFilter}
                onChange={(e) => setTrialTypeFilter(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="interventional">Interventional</option>
                <option value="observational">Observational</option>
                <option value="expanded">Expanded Access</option>
              </select>
            </div>
          </div>
          {/* ---------- CONTENT ---------- */}
          {loading ? (
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
              No clinical trials found
            </div>
          ) : (
            <TrialsListPaginated trials={filteredTrials} trialsPerPage={6} />
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ClinicalTrialsPage;
