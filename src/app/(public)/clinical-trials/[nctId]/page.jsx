"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar/Navbar";
import Footer from "@/components/Footer/Footer";
import Link from "next/link";
import Image from "next/image";
import { BadgeCheck, FileText, Globe, Languages, AlertTriangle, ExternalLink } from "lucide-react";
import "./TrialDetailPage.scss";
import TrialDetailQuestions from "@/components/TrialDetailQuestions/TrialDetailQuestions";
import {
  SUPPORTED_LANGUAGES,
  TRANSLATION_WARNINGS,
  TRANSLATION_LOADING_MESSAGES,
} from "@/lib/translationWarnings";

function getTrialIcon(trial) {
  const protocol = trial.raw_data?.protocolSection;
  if (!protocol) return "/trial-icons/observational.png";

  const studyType = protocol.designModule?.studyType?.toLowerCase() || "";
  if (studyType.includes("expanded")) return "/trial-icons/expandedaccess.png";
  if (studyType.includes("observational")) return "/trial-icons/observational.png";
  if (studyType.includes("interventional")) {
    const phasesRaw = protocol.designModule?.phases;
    const phases = Array.isArray(phasesRaw)
      ? phasesRaw.map((p) => p.toLowerCase())
      : typeof phasesRaw === "string"
      ? [phasesRaw.toLowerCase()]
      : [];
    if (phases.some((p) => p.includes("phase 1"))) return "/trial-icons/phase1.png";
    if (phases.some((p) => p.includes("phase 2"))) return "/trial-icons/phase2.png";
    if (phases.some((p) => p.includes("phase 3") || p.includes("phase 4")))
      return "/trial-icons/phase3or4.png";
    return "/trial-icons/phase1.png";
  }
  return "/trial-icons/observational.png";
}

function formatVerifiedDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export default function TrialDetailPage() {
  const { nctId } = useParams();
  const [trial, setTrial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAllLocations, setShowAllLocations] = useState(false);

  // Translation state
  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [translation, setTranslation] = useState(null);
  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    const fetchTrial = async () => {
      const res = await fetch(`/api/clinical-trials/${nctId}`, { cache: "no-store" });
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

  const isVerified = !!trial.verified_by;
  const verifier = trial.verified_by || {};
  const isCompleted = trial.archive_reason === "completed";
  const hasFindings = !!trial.findings;

  const handleTranslate = async (langCode) => {
    if (langCode === selectedLanguage) {
      setSelectedLanguage(null);
      setTranslation(null);
      return;
    }
    setSelectedLanguage(langCode);
    setTranslating(true);
    try {
      const res = await fetch(`/api/clinical-trials/${nctId}/translate?lang=${langCode}`);
      if (!res.ok) throw new Error("Translation failed");
      const data = await res.json();
      setTranslation(data);
    } catch (e) {
      console.error("Translation error:", e);
      setSelectedLanguage(null);
    } finally {
      setTranslating(false);
    }
  };

  // Pick translated content if available; otherwise fall back to original
  const t = (field) => translation?.[`translated_${field}`] || trial[field];

  return (
    <>
      <Navbar />

      <main className="trial-detail padding">
        <div className="boxed trial-detail__card">
          {/* ---------- VERIFICATION BANNER ---------- */}
          {isVerified && (
            <div className="trial-detail__verified-banner">
              <BadgeCheck size={24} />
              <div>
                <strong>Editor Verified</strong>
{trial.verified_at && (
  <span className="trial-detail__verified-date">
    {" "}— reviewed {formatVerifiedDate(trial.verified_at)}
  </span>
)}
                {trial.verified_at && (
                  <span className="trial-detail__verified-date">
                    {" "}— reviewed {formatVerifiedDate(trial.verified_at)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ---------- HEADER ---------- */}
          <header className="trial-detail__header">
            <div className="trial-detail__title-row">
              <img
                src={getTrialIcon(trial)}
                alt="Trial type"
                className="trial-detail__icon"
              />
              <h1 className="trial-detail__title">{t("short_title")}</h1>
            </div>

            {/* Status badges */}
            <div className="trial-detail__status-badges">
              {isCompleted && (
                <span className="trial-detail__status-badge trial-detail__status-badge--completed">
                  Completed
                </span>
              )}
              {hasFindings && (
                <span className="trial-detail__status-badge trial-detail__status-badge--findings">
                  <FileText size={12} /> Findings published
                </span>
              )}
            </div>
          </header>

          {/* ---------- LANGUAGE SWITCHER ---------- */}
          <div className="trial-detail__language-switcher">
            <Languages size={16} />
            <span className="trial-detail__language-label">Language:</span>
            <button
              className={`trial-detail__language-btn${selectedLanguage === null ? " trial-detail__language-btn--active" : ""}`}
              onClick={() => {
                setSelectedLanguage(null);
                setTranslation(null);
              }}
              disabled={translating}
            >
              English
            </button>
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                className={`trial-detail__language-btn${selectedLanguage === lang.code ? " trial-detail__language-btn--active" : ""}`}
                onClick={() => handleTranslate(lang.code)}
                disabled={translating}
              >
                {lang.nativeName}
              </button>
            ))}
          </div>

          {translating && selectedLanguage && (
            <p className="trial-detail__translating">
              {TRANSLATION_LOADING_MESSAGES[selectedLanguage] ||
                "The translation may take a moment. Thank you for your patience."}
            </p>
          )}

          {selectedLanguage && translation && !translating && (
            <div className="trial-detail__translation-warning">
              <AlertTriangle size={16} />
              <div>
                <p className="trial-detail__warning-native">
                  {TRANSLATION_WARNINGS[selectedLanguage]?.native}
                </p>
                <p className="trial-detail__warning-english">
                  {TRANSLATION_WARNINGS[selectedLanguage]?.english}
                </p>
              </div>
            </div>
          )}

          {/* ---------- META ---------- */}
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

          {/* ---------- FINDINGS (if completed + published) ---------- */}
          {hasFindings && (
            <section className="trial-detail__section trial-detail__findings">
              <h2>
                <FileText size={20} /> Study Findings
              </h2>
              <div
                className="trial-detail__findings-content"
                dangerouslySetInnerHTML={{
                  __html: t("findings") || "",
                }}
              />
              {trial.findings_url && (
                <Link
                  href={trial.findings_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="trial-detail__findings-link"
                >
                  Read the full paper <ExternalLink size={14} />
                </Link>
              )}
            </section>
          )}

          {/* ---------- SUMMARY ---------- */}
          {(trial.ai_summary_manual || trial.ai_summary) && (
            <section className="trial-detail__section">
              <h2>About This Study</h2>
              <p className="trial-detail__summary">
                {t("ai_summary")}
              </p>
            </section>
          )}

          {/* ---------- QUESTIONS ---------- */}
          <TrialDetailQuestions trial={{ ...trial, ...buildOverrides(trial, translation) }} />

          {/* ---------- DISCLAIMER (dynamic based on verification) ---------- */}
          <div className="trial-detail__disclaimer">
            {isVerified ? (
              <p>
  <BadgeCheck size={14} /> This summary has been reviewed and editor verified.
  {trial.verified_at
    ? ` Reviewed on ${formatVerifiedDate(trial.verified_at)}.`
    : ""}
</p>
            ) : (
              <p>
                ⚠️ This summary has not yet been verified by a researcher on the original study team.
              </p>
            )}
          </div>

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

/**
 * If a translation is loaded, build an overrides object so TrialDetailQuestions
 * renders translated answers without modifying its internals.
 */
function buildOverrides(trial, translation) {
  if (!translation) return {};
  return {
    ai_summary: translation.translated_ai_summary || trial.ai_summary,
    ai_purpose: translation.translated_ai_purpose || trial.ai_purpose,
    ai_treatments: translation.translated_ai_treatments || trial.ai_treatments,
    ai_design: translation.translated_ai_design || trial.ai_design,
    ai_eligibility: translation.translated_ai_eligibility || trial.ai_eligibility,
    ai_participation: translation.translated_ai_participation || trial.ai_participation,
    ai_leadership: translation.translated_ai_leadership || trial.ai_leadership,
    ai_prior_research: translation.translated_ai_prior_research || trial.ai_prior_research,
    ai_locations: translation.translated_ai_locations || trial.ai_locations,
    custom_questions: translation.translated_custom_questions || trial.custom_questions,
  };
}
