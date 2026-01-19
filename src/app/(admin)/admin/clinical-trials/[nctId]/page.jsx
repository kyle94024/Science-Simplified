"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar/Navbar";
import Footer from "@/components/Footer/Footer";
import "./AdminTrialEdit.scss";

const QUESTION_FIELDS = [
  { key: "ai_purpose_manual", label: "Purpose", base: "ai_purpose" },
  { key: "ai_treatments_manual", label: "Treatments", base: "ai_treatments" },
  { key: "ai_design_manual", label: "Study Design", base: "ai_design" },
  {
    key: "ai_eligibility_manual",
    label: "Eligibility",
    base: "ai_eligibility",
  },
  {
    key: "ai_participation_manual",
    label: "Participation",
    base: "ai_participation",
  },
  {
    key: "ai_leadership_manual",
    label: "Who Is Running the Study",
    base: "ai_leadership",
  },
  { key: "ai_locations_manual", label: "Locations", base: "ai_locations" },
  {
    key: "ai_prior_research_manual",
    label: "Prior Research",
    base: "ai_prior_research",
  },
];

export default function AdminTrialEditPage() {
  const { nctId } = useParams();
  const searchParams = useSearchParams();
  const tenant = searchParams.get("tenant");

  const [trial, setTrial] = useState(null);
  const [original, setOriginal] = useState(null);
  const [saving, setSaving] = useState(false);

  /*LOAD TRIAL*/
  useEffect(() => {
    if (!tenant) return;

    fetch(`/api/admin/clinical-trials/${nctId}?tenant=${tenant}`, {
      cache: "no-store",
    })
      .then(async (res) => {
        const text = await res.text();
        if (!res.ok) throw new Error(text || "Failed to load trial");
        return JSON.parse(text);
      })
      .then((data) => {
        setTrial(data.trial);
        setOriginal(data.trial); // ← store original values
      })
      .catch((err) => {
        console.error(err);
        alert("Failed to load trial");
      });
  }, [nctId, tenant]);

  if (!trial) return <p className="page-loading">Loading…</p>;

  /*SAVE*/
  async function save() {
    setSaving(true);

    const payload = {};

    payload.short_title_manual = trial.short_title_manual ?? null;
    payload.ai_summary_manual = trial.ai_summary_manual ?? null;

    QUESTION_FIELDS.forEach(({ key }) => {
      payload[key] = trial[key] ?? null;
    });

    const res = await fetch(
      `/api/admin/clinical-trials/${nctId}?tenant=${tenant}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok) {
      const err = await res.json();
      setSaving(false);
      alert(`Save failed: ${err.error}`);
      return;
    }

    setSaving(false);
    alert("Saved");
  }

  /*RESET HELPERS (NEW)*/
  function resetField(manualKey) {
    setTrial((prev) => ({
      ...prev,
      [manualKey]: null,
    }));
  }

  return (
    <>
      <Navbar />

      <main className="admin-edit">
        <div className="admin-edit__container">
          <h1>Edit Trial</h1>

          {/* TITLE */}
          <div className="admin-edit__field">
            <label>Title</label>
            <input
              value={trial.short_title_manual ?? trial.short_title ?? ""}
              onChange={(e) =>
                setTrial({ ...trial, short_title_manual: e.target.value })
              }
            />
            <button
              className="reset-btn"
              type="button"
              onClick={() => resetField("short_title_manual")}
            >
              Reset to original
            </button>
          </div>

          {/* SUMMARY */}
          <div className="admin-edit__field">
            <label>Summary</label>
            <textarea
              rows={6}
              value={trial.ai_summary_manual ?? trial.ai_summary ?? ""}
              onChange={(e) =>
                setTrial({ ...trial, ai_summary_manual: e.target.value })
              }
            />
            <button
              className="reset-btn"
              type="button"
              onClick={() => resetField("ai_summary_manual")}
            >
              Reset to original
            </button>
          </div>

          {/* QUESTIONS */}
          <h2 className="admin-edit__section-title">
            Questions About This Study
          </h2>

          {QUESTION_FIELDS.map(({ key, label, base }) => (
            <div className="admin-edit__field" key={key}>
              <label>{label}</label>
              <textarea
                rows={5}
                value={trial[key] ?? trial[base] ?? ""}
                onChange={(e) => setTrial({ ...trial, [key]: e.target.value })}
              />
              <button
                className="reset-btn"
                type="button"
                onClick={() => resetField(key)}
              >
                Reset to original
              </button>
            </div>
          ))}

          <button className="admin-edit__save" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </main>

      <Footer />
    </>
  );
}
