"use client";

import Link from "next/link";
import { MapPin, BadgeCheck, FileText, Archive } from "lucide-react";
import { useUiText } from "@/hooks/useUiText";
import { uiText } from "@/lib/uiText";
import { formatTrialAge } from "@/lib/clinicalTrials/ageLabels";
import "./TrialCard.scss";

const truncate = (text, len = 160) =>
  text && text.length > len ? text.slice(0, len) + "…" : text;

const formatAge = (min, max, t) => {
  if (!min && !max) return null;
  const [from, to] = [formatTrialAge(min, t), formatTrialAge(max, t)];
  if (min && !max) return `${from}+`;
  if (!min && max) return t("Up to {max}", { max: to });
  return `${from}–${to}`;
};

// ClinicalTrials.gov study types (the API sends them lowercased, e.g.
// "observational") as display labels — the same ones the type filter uses.
const STUDY_TYPE_LABELS = {
  interventional: uiText("Interventional"),
  observational: uiText("Observational"),
  expanded_access: uiText("Expanded Access"),
};

const formatStudyType = (type) => {
  if (!type) return null;
  return STUDY_TYPE_LABELS[type.toLowerCase()] || type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
};

export default function TrialCard({ trial }) {
  const t = useUiText();
  const ageLabel = formatAge(trial.min_age, trial.max_age, t);
  const isVerified = !!trial.verified_by;
  const isCompleted = trial.archive_reason === "completed";
  const hasFindings = !!trial.findings;
  const similarity = typeof trial.similarity === "number" ? trial.similarity : null;

  return (
    <article className={`trial-card article-card${isVerified ? " trial-card--verified" : ""}`}>
      <div className="trial-card__content">
        {/* BADGES */}
        {(isVerified || isCompleted || hasFindings || similarity !== null) && (
          <div className="trial-card__badges">
            {similarity !== null && (
              <span className="trial-card__badge trial-card__badge--fit" title={t("Match score: {score}%", { score: Math.round(similarity * 100) })}>
                {t("Best fit: {score}%", { score: Math.round(similarity * 100) })}
              </span>
            )}
            {isVerified && (
              <span
                className="trial-card__badge trial-card__badge--verified"
                title={t("Editor Verified — reviewed by a subject-matter editor")}
              >
                <BadgeCheck size={13} />
                {t("Editor Verified")}
              </span>
            )}
            {isCompleted && (
              <span className="trial-card__badge trial-card__badge--completed">
                <Archive size={12} />
                {t("Completed")}
              </span>
            )}
            {hasFindings && (
              <span className="trial-card__badge trial-card__badge--findings">
                <FileText size={12} />
                {t("Findings published")}
              </span>
            )}
          </div>
        )}

        {/* TITLE */}
        <h3 className="trial-card__title">
          {trial.short_title || t("Clinical Trial")}
        </h3>

        {/* LOCATION */}
        {Array.isArray(trial.locations) && trial.locations.length > 0 && (
          <div className="trial-card__location">
            <MapPin size={14} />
            <span>
              {trial.locations.length > 1
                ? t("Multiple Locations")
                : [trial.locations[0]?.city, trial.locations[0]?.state]
                    .filter(Boolean)
                    .join(", ")}
            </span>
          </div>
        )}

        {/* SUMMARY */}
        <p className="trial-card__summary">{truncate(trial.ai_summary)}</p>

        {/* TRIAL DETAILS LABEL */}
        <div className="trial-card__details-label">{t("Trial Details")}</div>

        {/* PILLS */}
        <div className="trial-card__pills">
          {ageLabel && (
            <span className="trial-card__pill">{t("Age: {age}", { age: ageLabel })}</span>
          )}
          {trial.study_type && (
            <span className="trial-card__pill">
              {t("Trial Type: {type}", { type: t(formatStudyType(trial.study_type)) })}
            </span>
          )}
        </div>
      </div>

      {/* CTA */}
      <Link
        href={`/clinical-trials/${trial.nct_id}`}
        className="trial-card__cta"
      >
        {t("Learn More")}
      </Link>
    </article>
  );
}
