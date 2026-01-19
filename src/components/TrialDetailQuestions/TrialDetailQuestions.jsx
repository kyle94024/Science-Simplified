"use client";

import { useState } from "react";
import "./TrialDetailQuestions.scss";

/* ---------------- SAFETY CHECK ---------------- */

function isBadAIText(text) {
  if (!text || !text.trim()) return true;

  const normalized = text.toLowerCase().trim();

  // ONLY truly broken AI responses
  const hardFailures = [
    "please paste",
    "if you share",
    "i can explain",
    "i can summarize",
    "not enough information provided",
    "the text you shared",
  ];

  return hardFailures.some((p) => normalized.includes(p));
}

/* ---------------- RENDER ---------------- */

function renderContent(text, fallback, isManual = false) {
  if (!isManual && isBadAIText(text)) {
    return <p className="trial-paragraph">{fallback}</p>;
  }

  const cleaned = text
    .replace(/###/g, "")
    .replace(/##/g, "")
    .replace(/\*\*/g, "")
    .replace(/---/g, "")
    .trim();

  const lines = cleaned
    .split(/\n{1,}/)
    .map((l) => l.trim())
    .filter(Boolean);
  const items = [];

  lines.forEach((line, i) => {
    const lower = line.toLowerCase();

    if (
      lower.includes("who may") ||
      lower.includes("who may be able") ||
      lower.includes("who cannot") ||
      lower.includes("who may not")
    ) {
      items.push(
        <h4 key={`h-${i}`} className="trial-subheading">
          {line}
        </h4>,
      );
      return;
    }

    if (line.startsWith("- ") || line.startsWith("• ")) {
      items.push(
        <li key={`li-${i}`} className="trial-list-item">
          {line.replace(/^[-•]\s*/, "")}
        </li>,
      );
      return;
    }

    items.push(
      <p key={`p-${i}`} className="trial-paragraph">
        {line}
      </p>,
    );
  });

  const hasListItems = items.some((el) => el.type === "li");

  return (
    <div className="trial-text">
      {hasListItems ? <ul className="trial-list">{items}</ul> : items}
    </div>
  );
}

/* ---------------- COMPONENT ---------------- */

export default function TrialDetailQuestions({ trial }) {
  const [openIndex, setOpenIndex] = useState(null);
  if (!trial) return null;

  const sections = [
    {
      title: "What is the purpose of this study?",
      text: trial.ai_purpose_manual || trial.ai_purpose,
      isManual: !!trial.ai_purpose_manual,
      fallback:
        "The purpose of this study is being reviewed by the research team.",
    },
    {
      title: "What treatments are being tested?",
      text: trial.ai_treatments_manual || trial.ai_treatments,
      isManual: !!trial.ai_treatments_manual,
      fallback:
        "The study team will explain what treatment or approach is being studied.",
    },
    {
      title: "Is there past research on this treatment?",
      text: trial.ai_prior_research_manual || trial.ai_prior_research,
      isManual: !!trial.ai_prior_research_manual,
      fallback:
        "There is limited publicly available information about prior research for this treatment.",
    },
    {
      title: "How is this study designed?",
      text: trial.ai_design_manual || trial.ai_design,
      isManual: !!trial.ai_design_manual,
      fallback: "The study design will be explained by the research team.",
    },
    {
      title: "Am I a good fit for this study?",
      text: trial.ai_eligibility_manual || trial.ai_eligibility,
      isManual: !!trial.ai_eligibility_manual,
      fallback: "Eligibility will be reviewed by the study team.",
    },
    {
      title: "What is participation like?",
      text: trial.ai_participation_manual || trial.ai_participation,
      isManual: !!trial.ai_participation_manual,
      fallback: "The study team will explain what participation involves.",
    },
    {
      title: "Who is running the study?",
      text: trial.ai_leadership_manual || trial.ai_leadership,
      isManual: !!trial.ai_leadership_manual,
      fallback:
        "This study is being run by the research team listed on ClinicalTrials.gov.",
    },
    {
      title: "Where is the study taking place?",
      text: trial.ai_locations_manual || trial.ai_locations,
      isManual: !!trial.ai_locations_manual,
      fallback: "Study locations will be provided by the research team.",
    },
  ];

  return (
    <div className="trial-questions">
      <h2 className="trial-questions__heading">Questions About This Study</h2>

      {sections.map((section, index) => (
        <div
          key={index}
          className={`accordion ${openIndex === index ? "open" : ""}`}
        >
          <button
            className="accordion__header"
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
          >
            <span>{section.title}</span>
            <span className="accordion__icon">
              {openIndex === index ? "−" : "+"}
            </span>
          </button>

          {openIndex === index && (
            <div className="accordion__content">
              <div className="trial-content">
                {renderContent(
                  section.text,
                  section.fallback,
                  section.isManual,
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
