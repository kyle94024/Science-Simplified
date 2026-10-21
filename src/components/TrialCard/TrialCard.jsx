"use client";

import Link from "next/link";
import { ArrowRight, Archive, BadgeCheck, Building2, FileText, FlaskConical, MapPin, UserRound, Users } from "lucide-react";
import { useUiText } from "@/hooks/useUiText";
import { trialLeadership, trialShortName } from "@/lib/clinicalTrials/display";
import { formatAgeRange, studyType, trialStatus } from "@/lib/clinicalTrials/labels";
import "./TrialCard.scss";

/** "Boston, Massachusetts", "6 locations in United States", "45 locations in 12 countries". */
const formatLocations = (locations, t) => {
  if (!Array.isArray(locations) || locations.length === 0) return null;
  if (locations.length === 1) {
    const l = locations[0] || {};
    return [l.city, l.state || l.country].filter(Boolean).join(", ") || null;
  }
  const countries = [...new Set(locations.map((l) => l?.country).filter(Boolean))];
  if (countries.length === 1) return t("{count} locations in {country}", { count: locations.length, country: countries[0] });
  return t("{count} locations in {countries} countries", { count: locations.length, countries: countries.length });
};

export default function TrialCard({ trial }) {
  const t = useUiText();
  const ageLabel = formatAgeRange(trial.min_age, trial.max_age, t);
  const isVerified = !!trial.verified_by;
  const isCompleted = trial.archive_reason === "completed";
  const hasFindings = !!trial.findings;
  const similarity = typeof trial.similarity === "number" ? trial.similarity : null;
  const shortName = trialShortName(trial);
  const leadership = trialLeadership(trial);
  const type = studyType(trial.study_type);
  const where = formatLocations(trial.locations, t);
  const status = !isCompleted ? trialStatus(trial.overall_status) : null;
  const href = `/clinical-trials/${trial.nct_id}`;

  return (
    <article className={`trial-card${isVerified ? " trial-card--verified" : ""}`}>
      <div className="trial-card__main">
        {/* NAME + STATUS */}
        <div className="trial-card__tags">
          {shortName && (
            <span className="trial-card__name" title={t("Official study name")} lang="en">
              {shortName}
            </span>
          )}
          {status && (
            <span className={`trial-card__status trial-card__status--${status.tone}`} title={status.hint ? t(status.hint) : undefined}>
              <span className="trial-card__status-dot" aria-hidden="true" />
              {t(status.label)}
            </span>
          )}
          {isVerified && (
            <span className="trial-card__badge trial-card__badge--verified" title={t("Editor Verified — reviewed by a subject-matter editor")}>
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
          {similarity !== null && (
            <span className="trial-card__badge trial-card__badge--fit" title={t("Match score: {score}%", { score: Math.round(similarity * 100) })}>
              {t("Best fit: {score}%", { score: Math.round(similarity * 100) })}
            </span>
          )}
        </div>

        {/* TITLE — the link covers the whole card */}
        <h3 className="trial-card__title">
          <Link href={href} className="trial-card__link">
            {trial.short_title || t("Clinical Trial")}
          </Link>
        </h3>

        {/* WHO RUNS IT */}
        {leadership && (
          <p className="trial-card__lead">
            {leadership.person ? <UserRound size={15} aria-hidden="true" /> : <Building2 size={15} aria-hidden="true" />}
            <span>
              {t.rich("Led by {name}", {
                name: (
                  <span className="trial-card__lead-name">
                    {leadership.person && <strong>{leadership.person}</strong>}
                    {leadership.person && leadership.organization && <span className="trial-card__lead-sep"> · </span>}
                    {leadership.organization && (leadership.person ? leadership.organization : <strong>{leadership.organization}</strong>)}
                  </span>
                ),
              })}
            </span>
          </p>
        )}

        {/* SUMMARY */}
        {trial.ai_summary && <p className="trial-card__summary">{trial.ai_summary}</p>}

        {/* KEY FACTS */}
        {(where || ageLabel || type) && (
          <ul className="trial-card__facts">
            {where && (
              <li>
                <MapPin size={14} aria-hidden="true" />
                {where}
              </li>
            )}
            {ageLabel && (
              <li>
                <Users size={14} aria-hidden="true" />
                {t("Age: {age}", { age: ageLabel })}
              </li>
            )}
            {type && (
              <li title={type.hint ? t(type.hint) : undefined}>
                <FlaskConical size={14} aria-hidden="true" />
                {t(type.label)}
              </li>
            )}
          </ul>
        )}
      </div>

      <span className="trial-card__cta" aria-hidden="true">
        {t("View study")}
        <ArrowRight size={16} />
      </span>
    </article>
  );
}

/** Placeholder row while trials load. */
export function TrialCardSkeleton() {
  return (
    <div className="trial-card trial-card--skeleton" aria-hidden="true">
      <div className="trial-card__main">
        <span className="trial-card__bone trial-card__bone--tag" />
        <span className="trial-card__bone trial-card__bone--title" />
        <span className="trial-card__bone trial-card__bone--line" />
        <span className="trial-card__bone trial-card__bone--line" />
        <span className="trial-card__bone trial-card__bone--short" />
      </div>
    </div>
  );
}
