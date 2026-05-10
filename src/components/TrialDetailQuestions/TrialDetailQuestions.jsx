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

// Default 8 questions — keyed by field name so admins can hide them via hidden_questions[]
const DEFAULT_SECTIONS = [
  { key: "ai_purpose", title: "What is the purpose of this study?", fallback: "The purpose of this study is being reviewed by the research team." },
  { key: "ai_treatments", title: "What treatments are being tested?", fallback: "The study team will explain what treatment or approach is being studied." },
  { key: "ai_prior_research", title: "Is there past research on this treatment?", fallback: "There is limited publicly available information about prior research for this treatment." },
  { key: "ai_design", title: "How is this study designed?", fallback: "The study design will be explained by the research team." },
  { key: "ai_eligibility", title: "Am I a good fit for this study?", fallback: "Eligibility will be reviewed by the study team." },
  { key: "ai_participation", title: "What is participation like?", fallback: "The study team will explain what participation involves." },
  { key: "ai_leadership", title: "Who is running the study?", fallback: "This study is being run by the research team listed on ClinicalTrials.gov." },
  { key: "ai_locations", title: "Where is the study taking place?", fallback: "Study locations will be provided by the research team." },
];

export default function TrialDetailQuestions({ trial }) {
  const [openIndex, setOpenIndex] = useState(null);
  if (!trial) return null;

  const hidden = new Set(trial.hidden_questions || []);

  // Build default sections (filtered by hidden_questions)
  const defaultSections = DEFAULT_SECTIONS.filter((s) => !hidden.has(s.key)).map((s) => ({
    title: s.title,
    text: trial[`${s.key}_manual`] || trial[s.key],
    isManual: !!trial[`${s.key}_manual`],
    fallback: s.fallback,
    isCustom: false,
  }));

  // Custom questions appended after defaults
  const customQuestions = Array.isArray(trial.custom_questions) ? trial.custom_questions : [];
  const customSections = customQuestions.map((q) => ({
    title: q.question || "Custom question",
    text: q.answer,
    isManual: true,
    isCustom: true,
    fallback: "Answer pending.",
  }));

  const sections = [...defaultSections, ...customSections];

  return (
    <div className="trial-questions">
      <h2 className="trial-questions__heading">Questions About This Study</h2>

      {sections.map((section, index) => (
        <div
          key={index}
          className={`accordion ${openIndex === index ? "open" : ""}${section.isCustom ? " accordion--custom" : ""}`}
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
                {renderContent(section.text, section.fallback, section.isManual)}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
