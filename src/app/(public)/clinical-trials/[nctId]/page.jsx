"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar/Navbar";
import Footer from "@/components/Footer/Footer";
import Link from "next/link";
import Image from "next/image";
import { BadgeCheck, FileText, Globe, Languages, AlertTriangle, ExternalLink, MapPin, Pencil } from "lucide-react";
import "./TrialDetailPage.scss";
import useAuthStore from "@/store/useAuthStore";
import { tenant } from "@/lib/config";
import TrialDetailQuestions from "@/components/TrialDetailQuestions/TrialDetailQuestions";
import {
  SUPPORTED_LANGUAGES,
  TRANSLATION_WARNINGS,
  TRANSLATION_LOADING_MESSAGES,
} from "@/lib/translationWarnings";
import { useUiText } from "@/hooks/useUiText";
import { formatLeadership, trialLeadership, trialShortName } from "@/lib/clinicalTrials/display";
import { formatAgeRange, studyType, trialPhase, trialStatus } from "@/lib/clinicalTrials/labels";

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

function formatVerifiedDate(iso, locale) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(locale, {
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
  const { isAdmin } = useAuthStore();
  const t = useUiText();
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

  if (loading) return <p className="page-loading">{t("Loading…")}</p>;
  if (!trial) return <p className="page-error">{t("Trial not found")}</p>;

  const protocol = trial.raw_data?.protocolSection;
  const locations =
    protocol?.contactsLocationsModule?.locations
      ?.map((l) => [l.city, l.state, l.country].filter(Boolean).join(", "))
      .filter(Boolean) || [];
  const minAge = protocol?.eligibilityModule?.minimumAge;
  const maxAge = protocol?.eligibilityModule?.maximumAge;

  const isVerified = !!trial.verified_by;
  const isCompleted = trial.archive_reason === "completed";
  const shortName = trialShortName(trial);
  const leadBy = formatLeadership(trialLeadership(trial));
  // The sponsor, when "Led by" names someone else (an academic chair of a company trial).
  const sponsor = protocol?.sponsorCollaboratorsModule?.leadSponsor?.name;
  const showSponsor = sponsor && !(leadBy || "").includes(sponsor);
  const status = !isCompleted ? trialStatus(trial.overall_status) : null;
  const type = studyType(protocol?.designModule?.studyType);
  const phase = trialPhase(protocol?.designModule?.phases, t);
  const ages = formatAgeRange(minAge, maxAge, t);
  const hasFindings = !!trial.findings;
  const dateLocale = t.lang === "en" ? undefined : t.lang;

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
  const tf = (field) => translation?.[`translated_${field}`] || trial[field];

  return (
    <>
      <Navbar />

      <main className="trial-detail padding">
        {/* Header and body on the left, "Study at a glance" beside them (below the
            header on narrower screens). */}
        <div className="trial-detail__layout">
          <div className="trial-detail__card trial-detail__head">
            {/* ---------- ADMIN EDIT (admins only) ---------- */}
            {isAdmin && (
              <Link
                href={`/admin/clinical-trials/${nctId}?tenant=${tenant.shortName}`}
                className="trial-detail__admin-edit"
              >
                <Pencil size={14} /> Edit this trial
              </Link>
            )}

            {/* ---------- VERIFICATION BANNER ---------- */}
            {/* Patient-facing: generic "Editor Verified" trust badge only — the
                verifier's identity is tracked internally (verified_by) and shown
                on the admin side, but never exposed publicly. */}
            {isVerified && (
              <div className="trial-detail__verified-banner">
                <BadgeCheck size={26} />
                <div>
                  <strong>{t("Editor Verified")}</strong>
                  <span className="trial-detail__verified-date">
                    {trial.verified_at
                      ? ` — ${t("reviewed by a subject-matter editor on {date}", {
                          date: formatVerifiedDate(trial.verified_at, dateLocale),
                        })}`
                      : ` — ${t("reviewed by a subject-matter editor")}`}
                  </span>
                </div>
              </div>
            )}

            {/* ---------- HEADER ---------- */}
            <header className="trial-detail__header">
              {shortName && (
                <span className="trial-detail__short-name" title={t("Official study name")} lang="en">
                  {shortName}
                </span>
              )}
              <div className="trial-detail__title-row">
                <img
                  src={getTrialIcon(trial)}
                  alt={t("Trial type")}
                  className="trial-detail__icon"
                />
                <h1 className="trial-detail__title">{tf("short_title")}</h1>
              </div>

              {leadBy && (
                <p className="trial-detail__lead">
                  {t.rich("Led by {name}", { name: <strong>{leadBy}</strong> })}
                </p>
              )}

              {/* Status badges */}
              <div className="trial-detail__status-badges">
                {isCompleted && (
                  <span className="trial-detail__status-badge trial-detail__status-badge--completed">
                    {t("Completed")}
                  </span>
                )}
                {hasFindings && (
                  <span className="trial-detail__status-badge trial-detail__status-badge--findings">
                    <FileText size={12} /> {t("Findings published")}
                  </span>
                )}
              </div>
            </header>

            {/* ---------- LANGUAGE SWITCHER ---------- */}
            <div className="trial-detail__language-switcher">
              <Languages size={16} />
              <span className="trial-detail__language-label">{t("Language:")}</span>
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
                  t("The translation may take a moment. Thank you for your patience.")}
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
          </div>

          {/* ---------- STUDY AT A GLANCE ---------- */}
          <aside className="trial-detail__aside" aria-labelledby="trial-glance-title">
            <h2 id="trial-glance-title" className="trial-detail__aside-title">
              {t("Study at a glance")}
            </h2>
            <dl className="trial-detail__facts">
              {status && (
                <div>
                  <dt>{t("Status")}</dt>
                  <dd>
                    <span className={`trial-detail__status trial-detail__status--${status.tone}`} title={status.hint ? t(status.hint) : undefined}>
                      <span className="trial-detail__status-dot" aria-hidden="true" />
                      {t(status.label)}
                    </span>
                  </dd>
                </div>
              )}
              {ages && (
                <div>
                  <dt>{t("Ages")}</dt>
                  <dd>{ages}</dd>
                </div>
              )}
              {type && (
                <div>
                  <dt>{t("Study type")}</dt>
                  <dd>
                    {t(type.label)}
                    {phase && ` · ${phase}`}
                    {type.hint && <span className="trial-detail__fact-hint">{t(type.hint)}</span>}
                  </dd>
                </div>
              )}
              {showSponsor && (
                <div>
                  <dt>{t("Sponsor")}</dt>
                  <dd>{sponsor}</dd>
                </div>
              )}
              {locations.length > 0 && (
                <div>
                  <dt>{t("Locations")}</dt>
                  <dd>
                    <ul className="trial-detail__locations">
                      {locations.slice(0, showAllLocations ? locations.length : 6).map((loc, i) => (
                        <li key={i}>
                          <MapPin size={14} aria-hidden="true" />
                          {loc}
                        </li>
                      ))}
                    </ul>
                    {locations.length > 6 && (
                      <button
                        type="button"
                        className="locations-toggle"
                        onClick={() => setShowAllLocations((prev) => !prev)}
                      >
                        {showAllLocations
                          ? t("Show fewer locations")
                          : t("+ {count} more locations", { count: locations.length - 6 })}
                      </button>
                    )}
                  </dd>
                </div>
              )}
              <div>
                <dt>{t("ClinicalTrials.gov ID")}</dt>
                <dd>{trial.nct_id}</dd>
              </div>
            </dl>
            <Link
              href={`https://clinicaltrials.gov/study/${trial.nct_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary-green trial-detail__ctgov"
            >
              {t("View full study on ClinicalTrials.gov")}
              <ExternalLink size={15} aria-hidden="true" />
            </Link>
          </aside>

          <div className="trial-detail__card trial-detail__body">
            {/* ---------- FINDINGS (if completed + published) ---------- */}
            {hasFindings && (
              <section className="trial-detail__section trial-detail__findings">
                <h2>
                  <FileText size={20} /> {t("Study Findings")}
                </h2>
                <div
                  className="trial-detail__findings-content"
                  dangerouslySetInnerHTML={{
                    __html: tf("findings") || "",
                  }}
                />
                {trial.findings_url && (
                  <Link
                    href={trial.findings_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="trial-detail__findings-link"
                  >
                    {t("Read the full paper")} <ExternalLink size={14} />
                  </Link>
                )}
              </section>
            )}

            {/* ---------- SUMMARY ---------- */}
            {(trial.ai_summary_manual || trial.ai_summary) && (
              <section className="trial-detail__section trial-detail__section--first">
                <h2>{t("About This Study")}</h2>
                <p className="trial-detail__summary">
                  {tf("ai_summary")}
                </p>
              </section>
            )}

            {/* ---------- QUESTIONS ---------- */}
            <TrialDetailQuestions trial={{ ...trial, ...buildOverrides(trial, translation) }} />

            {/* ---------- DISCLAIMER (dynamic based on verification) ---------- */}
            <div className="trial-detail__disclaimer">
              {isVerified ? (
                <p>
                  <BadgeCheck size={14} />{" "}
                  {trial.verified_at
                    ? t("This summary was reviewed and verified by a subject-matter editor on {date}.", {
                        date: formatVerifiedDate(trial.verified_at, dateLocale),
                      })
                    : t("This summary was reviewed and verified by a subject-matter editor.")}
                </p>
              ) : (
                <p>
                  ⚠️ {t("This summary has not yet been reviewed and verified by an editor.")}
                </p>
              )}
            </div>
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
