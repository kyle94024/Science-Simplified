"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import "./TrialCard.scss";

const truncate = (text, len = 160) =>
  text && text.length > len ? text.slice(0, len) + "…" : text;

const formatAge = (min, max) => {
  if (!min && !max) return null;
  if (min && !max) return `${min}+`;
  if (!min && max) return `Up to ${max}`;
  return `${min}–${max}`;
};

const formatStudyType = (type) => {
  if (!type) return null;
  return type.charAt(0) + type.slice(1).toLowerCase();
};

export default function TrialCard({ trial }) {
  const ageLabel = formatAge(trial.min_age, trial.max_age);

  return (
    <article className="trial-card article-card">
      <div className="trial-card__content">
        {/* TITLE */}
        <h3 className="trial-card__title">
          {trial.short_title || "Clinical Trial"}
        </h3>

        {/* LOCATION */}
        {Array.isArray(trial.locations) && trial.locations.length > 0 && (
          <div className="trial-card__location">
            <MapPin size={14} />
            <span>
              {trial.locations.length > 1
                ? "Multiple Locations"
                : [trial.locations[0]?.city, trial.locations[0]?.state]
                    .filter(Boolean)
                    .join(", ")}
            </span>
          </div>
        )}

        {/* SUMMARY */}
        <p className="trial-card__summary">{truncate(trial.ai_summary)}</p>

        {/* TRIAL DETAILS LABEL */}
        <div className="trial-card__details-label">Trial Details</div>

        {/* PILLS */}
        <div className="trial-card__pills">
          {ageLabel && (
            <span className="trial-card__pill">Age: {ageLabel}</span>
          )}
          {trial.study_type && (
            <span className="trial-card__pill">
              Trial Type: {formatStudyType(trial.study_type)}
            </span>
          )}
        </div>
      </div>

      {/* CTA */}
      <Link
        href={`/clinical-trials/${trial.nct_id}`}
        className="trial-card__cta"
      >
        Learn More
      </Link>
    </article>
  );
}
