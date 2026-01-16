"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar/Navbar";
import Footer from "@/components/Footer/Footer";
import Link from "next/link";
import { MapPin, Users, Activity } from "lucide-react";
import "./TrialDetailPage.scss";
import TrialDetailQuestions from "@/components/TrialDetailQuestions/TrialDetailQuestions";

function getTrialIcon(trial) {
  const protocol = trial.raw_data?.protocolSection;
  if (!protocol) return "/trial-icons/observational.png";

  const studyType = protocol.designModule?.studyType?.toLowerCase() || "";

  // Expanded access
  if (studyType.includes("expanded")) {
    return "/trial-icons/expandedaccess.png";
  }

  // Observational
  if (studyType.includes("observational")) {
    return "/trial-icons/observational.png";
  }

  // Interventional
  if (studyType.includes("interventional")) {
    const phasesRaw = protocol.designModule?.phases;

    const phases = Array.isArray(phasesRaw)
      ? phasesRaw.map((p) => p.toLowerCase())
      : typeof phasesRaw === "string"
      ? [phasesRaw.toLowerCase()]
      : [];

    if (phases.some((p) => p.includes("phase 1"))) {
      return "/trial-icons/phase1.png";
    }

    if (phases.some((p) => p.includes("phase 2"))) {
      return "/trial-icons/phase2.png";
    }

    if (phases.some((p) => p.includes("phase 3") || p.includes("phase 4"))) {
      return "/trial-icons/phase3or4.png";
    }

    return "/trial-icons/phase1.png";
  }

  return "/trial-icons/observational.png";
}

export default function TrialDetailPage() {
  const { nctId } = useParams();
  const [trial, setTrial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAllLocations, setShowAllLocations] = useState(false);

  useEffect(() => {
    const fetchTrial = async () => {
      const res = await fetch(`/api/clinical-trials/${nctId}`, {
        cache: "no-store",
      });
      const data = await res.json();
      setTrial(data.trial);
      setLoading(false);
    };

    fetchTrial();
  }, [nctId]);

  if (loading) return <p className="page-loading">Loading…</p>;
  if (!trial) return <p className="page-error">Trial not found</p>;

  const protocol = trial.raw_data?.protocolSection;

  const locations =
    protocol?.contactsLocationsModule?.locations
      ?.map((l) => [l.city, l.state, l.country].filter(Boolean).join(", "))
      .filter(Boolean) || [];

  const minAge = protocol?.eligibilityModule?.minimumAge;
  const maxAge = protocol?.eligibilityModule?.maximumAge;

  const phase =
    protocol?.designModule?.phases ?? protocol?.designModule?.phaseList ?? null;

  return (
    <>
      <Navbar />

      <main className="trial-detail padding">
        <div className="boxed trial-detail__card">
          {/* ---------- HEADER ---------- */}
          <header className="trial-detail__header">
            <div className="trial-detail__title-row">
              <img
                src={getTrialIcon(trial)}
                alt="Trial type"
                className="trial-detail__icon"
              />
              <h1 className="trial-detail__title">
                {trial.short_title_manual || trial.short_title}
              </h1>
            </div>
          </header>

          {/* ---------- META / BADGES ---------- */}

          <div className="trial-detail__meta">
            {locations
              .slice(0, showAllLocations ? locations.length : 6)
              .map((loc, i) => (
                <div key={i} className="meta-item">
                  <span className="meta-icon">📍</span>
                  <span>{loc}</span>
                </div>
              ))}

            {locations.length > 6 && (
              <button
                type="button"
                className="locations-toggle"
                onClick={() => setShowAllLocations((prev) => !prev)}
              >
                {showAllLocations
                  ? "Show fewer locations"
                  : `+ ${locations.length - 6} more locations`}
              </button>
            )}

            {(minAge || maxAge) && (
              <div className="meta-item">
                <span className="meta-icon">👤</span>
                <span>
                  Ages {minAge ?? "?"} – {maxAge ?? "?"}
                </span>
              </div>
            )}
          </div>

          {/* ---------- SUMMARY ---------- */}
          {(trial.ai_summary_manual || trial.ai_summary) && (
            <section className="trial-detail__section">
              <h2>About This Study</h2>
              <p className="trial-detail__summary">
                {trial.ai_summary_manual || trial.ai_summary}
              </p>
            </section>
          )}

          {/* ---------- QUESTIONS ---------- */}
          <TrialDetailQuestions trial={trial} />
          {/* ---------- CTA ---------- */}
          <div className="trial-detail__actions">
            <Link
              href={`https://clinicaltrials.gov/study/${trial.nct_id}`}
              target="_blank"
              className="btn btn-primary-green"
            >
              View full study on ClinicalTrials.gov
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
