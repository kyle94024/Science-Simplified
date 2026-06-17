"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, ShieldOff, Loader2, Pencil, Search } from "lucide-react";
import CustomQuestionsEditor from "@/components/admin/trials/CustomQuestionsEditor";
import "./TrialEditor.scss";

const DEFAULT_QUESTION_FIELDS = [
  { key: "ai_purpose_manual", label: "Purpose", base: "ai_purpose", defaultKey: "ai_purpose" },
  { key: "ai_treatments_manual", label: "Treatments", base: "ai_treatments", defaultKey: "ai_treatments" },
  { key: "ai_design_manual", label: "Study Design", base: "ai_design", defaultKey: "ai_design" },
  { key: "ai_eligibility_manual", label: "Eligibility", base: "ai_eligibility", defaultKey: "ai_eligibility" },
  { key: "ai_participation_manual", label: "Participation", base: "ai_participation", defaultKey: "ai_participation" },
  { key: "ai_leadership_manual", label: "Who Is Running the Study", base: "ai_leadership", defaultKey: "ai_leadership" },
  { key: "ai_locations_manual", label: "Locations", base: "ai_locations", defaultKey: "ai_locations" },
  { key: "ai_prior_research_manual", label: "Prior Research", base: "ai_prior_research", defaultKey: "ai_prior_research" },
];

/**
 * Unified trial editor used by admin AND researcher routes.
 * mode='admin' shows: verification controls, all defaults
 * mode='researcher' hides: removing verification, tenant switcher
 */
export default function TrialEditor({ nctId, tenant, mode = "admin" }) {
  const [trial, setTrial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profiles, setProfiles] = useState([]);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [profileSearch, setProfileSearch] = useState("");
  // Editable reviewer details (name/degree/university) used by the verify modal
  // and by the "edit details" form shown when a trial is already verified.
  const emptyVerifier = { profileId: null, name: "", degree: "", university: "" };
  const [verifierForm, setVerifierForm] = useState(emptyVerifier);
  const [editingVerifier, setEditingVerifier] = useState(false);

  useEffect(() => {
    if (!tenant && mode === "admin") return;
    (async () => {
      try {
        const url = tenant
          ? `/api/admin/clinical-trials/${nctId}?tenant=${tenant}`
          : `/api/admin/clinical-trials/${nctId}`;
        const res = await fetch(url, { cache: "no-store" });
        const text = await res.text();
        if (!res.ok) throw new Error(text || "Failed to load");
        const data = JSON.parse(text);
        setTrial(data.trial);
      } catch (err) {
        console.error(err);
        alert("Failed to load trial");
      } finally {
        setLoading(false);
      }
    })();
  }, [nctId, tenant, mode]);

  // Load profiles for verifier picker (admin only)
  useEffect(() => {
    if (mode !== "admin" || !showVerifyModal) return;
    fetch("/api/editors")
      .then((r) => r.json())
      .then((data) => setProfiles(data.editors || data || []))
      .catch(() => setProfiles([]));
  }, [mode, showVerifyModal]);

  if (loading) return <p className="trial-editor__loading">Loading…</p>;
  if (!trial) return <p className="trial-editor__error">Trial not found</p>;

  async function save() {
    setSaving(true);
    const payload = {
      short_title_manual: trial.short_title_manual ?? null,
      ai_summary_manual: trial.ai_summary_manual ?? null,
      custom_questions: trial.custom_questions || [],
      hidden_questions: trial.hidden_questions || [],
      findings: trial.findings ?? null,
      findings_url: trial.findings_url ?? null,
    };
    DEFAULT_QUESTION_FIELDS.forEach(({ key }) => {
      payload[key] = trial[key] ?? null;
    });

    try {
      const url = tenant
        ? `/api/admin/clinical-trials/${nctId}?tenant=${tenant}`
        : `/api/admin/clinical-trials/${nctId}`;
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Save failed");
      }
      alert("Saved");
    } catch (err) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  function resetField(manualKey) {
    setTrial((prev) => ({ ...prev, [manualKey]: null }));
  }

  function toggleHidden(key) {
    setTrial((prev) => {
      const set = new Set(prev.hidden_questions || []);
      if (set.has(key)) set.delete(key);
      else set.add(key);
      return { ...prev, hidden_questions: Array.from(set) };
    });
  }

  // Pre-fill the editable fields from a selected profile (admin can then tweak).
  function selectProfile(p) {
    setVerifierForm({
      profileId: p.user_id || p.id,
      name: p.name || "",
      degree: p.degree || "",
      university: p.university || "",
    });
  }

  // Shared POST to the verify endpoint with the current verifierForm values.
  async function postVerify(payload) {
    const res = await fetch(`/api/clinical-trials/${nctId}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Verify failed");
    }
    return (await res.json()).trial;
  }

  // Confirm a NEW verification using the (possibly edited) name/degree.
  async function confirmVerify() {
    if (!verifierForm.name.trim()) {
      alert("Enter a reviewer name (or pick a profile).");
      return;
    }
    try {
      const t = await postVerify({
        profileId: verifierForm.profileId,
        name: verifierForm.name,
        degree: verifierForm.degree,
        university: verifierForm.university,
      });
      setTrial((prev) => ({
        ...prev,
        verified_by: t.verified_by,
        verified_at: t.verified_at,
        workflow_status: "published",
      }));
      setShowVerifyModal(false);
      setVerifierForm(emptyVerifier);
    } catch (err) {
      alert(`Verify failed: ${err.message}`);
    }
  }

  // Open the inline "edit reviewer details" form for an already-verified trial.
  function startEditVerifier() {
    setVerifierForm({
      profileId: trial.verified_by?.userId ?? null,
      name: trial.verified_by?.name || "",
      degree: trial.verified_by?.degree || "",
      university: trial.verified_by?.university || "",
    });
    setEditingVerifier(true);
  }

  // Save edited name/degree/university into the existing verified_by snapshot
  // (no profileId → the endpoint merges over the current snapshot, keeps date).
  async function saveVerifierDetails() {
    if (!verifierForm.name.trim()) {
      alert("Reviewer name can't be empty.");
      return;
    }
    try {
      const t = await postVerify({
        name: verifierForm.name,
        degree: verifierForm.degree,
        university: verifierForm.university,
      });
      setTrial((prev) => ({
        ...prev,
        verified_by: t.verified_by,
        verified_at: t.verified_at,
      }));
      setEditingVerifier(false);
    } catch (err) {
      alert(`Save failed: ${err.message}`);
    }
  }

  async function handleUnverify() {
    if (!confirm("Remove verification from this trial?")) return;
    try {
      const res = await fetch(`/api/clinical-trials/${nctId}/verify`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed");
      setTrial((prev) => ({ ...prev, verified_by: null, verified_at: null }));
    } catch (err) {
      alert("Failed to remove verification");
    }
  }

  async function submitForReview() {
  try {
    const res = await fetch(
      `/api/researcher/assigned-trials/${nctId}/submit`,
      {
        method: "POST",
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed");
    }

    alert("Submitted for review");

    setTrial((prev) => ({
      ...prev,
      workflow_status: "review_submitted",
    }));
  } catch (err) {
    alert(err.message);
  }
}

  const isVerified = !!trial.verified_by;
  const isCompleted = trial.archive_reason === "completed";
  const hidden = new Set(trial.hidden_questions || []);

  const filteredProfiles = profileSearch.trim()
    ? profiles.filter((p) => {
        const q = profileSearch.trim().toLowerCase();
        return (
          (p.name || "").toLowerCase().includes(q) ||
          (p.degree || "").toLowerCase().includes(q) ||
          (p.university || "").toLowerCase().includes(q)
        );
      })
    : profiles;

  return (
    <div className="trial-editor">
      <h1>Edit Trial: {trial.short_title_manual || trial.short_title}</h1>
      <p className="trial-editor__nct">NCT ID: {trial.nct_id}</p>

      {/* ---------- VERIFICATION (admin only) ---------- */}
      {mode === "admin" && (
        <section className="trial-editor__section trial-editor__verification">
          <h2>Verification</h2>
          {isVerified ? (
            editingVerifier ? (
              <div className="trial-editor__verifier-edit">
                <p className="trial-editor__hint">
                  Edit how this reviewer appears on the public trial page.
                </p>
                <div className="trial-editor__field">
                  <label>Reviewer name</label>
                  <input
                    value={verifierForm.name}
                    onChange={(e) => setVerifierForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Dr. Jane Smith"
                  />
                </div>
                <div className="trial-editor__field">
                  <label>Degree / credentials</label>
                  <input
                    value={verifierForm.degree}
                    onChange={(e) => setVerifierForm((f) => ({ ...f, degree: e.target.value }))}
                    placeholder="MD, PhD"
                  />
                </div>
                <div className="trial-editor__field">
                  <label>Affiliation (optional)</label>
                  <input
                    value={verifierForm.university}
                    onChange={(e) => setVerifierForm((f) => ({ ...f, university: e.target.value }))}
                    placeholder="Stanford University"
                  />
                </div>
                <div className="trial-editor__verifier-edit-actions">
                  <button type="button" className="trial-editor__verify-btn" onClick={saveVerifierDetails}>
                    Save reviewer details
                  </button>
                  <button
                    type="button"
                    className="trial-editor__modal-cancel"
                    onClick={() => setEditingVerifier(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="trial-editor__verified">
                <BadgeCheck size={20} />
                <div>
                  <strong>{trial.verified_by.name}</strong>
                  {trial.verified_by.degree ? `, ${trial.verified_by.degree}` : ""}
                  {trial.verified_by.university ? ` (${trial.verified_by.university})` : ""}
                  <div className="trial-editor__verified-date">
                    Verified {trial.verified_at ? new Date(trial.verified_at).toLocaleDateString() : ""}
                  </div>
                </div>
                <button type="button" className="trial-editor__verify-btn" onClick={startEditVerifier}>
                  <Pencil size={14} /> Edit name / degree
                </button>
                <button type="button" className="trial-editor__unverify-btn" onClick={handleUnverify}>
                  <ShieldOff size={14} /> Remove verification
                </button>
              </div>
            )
          ) : (
            <button
              type="button"
              className="trial-editor__verify-btn"
              onClick={() => {
                setVerifierForm(emptyVerifier);
                setShowVerifyModal(true);
              }}
            >
              <BadgeCheck size={16} /> Verify this trial
            </button>
          )}

          {showVerifyModal && (
            <div className="trial-editor__modal" onClick={() => setShowVerifyModal(false)}>
              <div
                className="trial-editor__modal-content trial-editor__modal-content--wide"
                onClick={(e) => e.stopPropagation()}
              >
                <h3>Verify trial</h3>
                <p>
                  Pick a researcher to pre-fill their details, then edit the name or
                  degree if needed. The name and degree on the right are what appear publicly.
                </p>

                <div className="trial-editor__verify-grid">
                  {/* LEFT: searchable researcher list */}
                  <div className="trial-editor__verify-col trial-editor__verify-col--list">
                    <div className="trial-editor__profile-search">
                      <Search size={14} />
                      <input
                        type="text"
                        value={profileSearch}
                        onChange={(e) => setProfileSearch(e.target.value)}
                        placeholder="Search researchers…"
                      />
                    </div>
                    <div className="trial-editor__profile-list">
                      {profiles.length === 0 ? (
                        <p className="trial-editor__profile-empty">Loading profiles…</p>
                      ) : filteredProfiles.length === 0 ? (
                        <p className="trial-editor__profile-empty">No researchers match “{profileSearch}”.</p>
                      ) : (
                        filteredProfiles.map((p) => {
                          const id = p.user_id || p.id;
                          const selected = verifierForm.profileId === id;
                          return (
                            <button
                              key={id}
                              type="button"
                              className={`trial-editor__profile-item${selected ? " trial-editor__profile-item--selected" : ""}`}
                              onClick={() => selectProfile(p)}
                            >
                              <strong>{p.name}</strong>
                              {p.degree && <span>, {p.degree}</span>}
                              {p.university && <div className="trial-editor__profile-univ">{p.university}</div>}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* RIGHT: editable reviewer details (what shows publicly) */}
                  <div className="trial-editor__verify-col trial-editor__verify-col--form">
                    <div className="trial-editor__field">
                      <label>Reviewer name (shown publicly)</label>
                      <input
                        value={verifierForm.name}
                        onChange={(e) => setVerifierForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="Dr. Jane Smith"
                      />
                    </div>
                    <div className="trial-editor__field">
                      <label>Degree / credentials</label>
                      <input
                        value={verifierForm.degree}
                        onChange={(e) => setVerifierForm((f) => ({ ...f, degree: e.target.value }))}
                        placeholder="MD, PhD"
                      />
                    </div>
                    <div className="trial-editor__field">
                      <label>Affiliation (optional)</label>
                      <input
                        value={verifierForm.university}
                        onChange={(e) => setVerifierForm((f) => ({ ...f, university: e.target.value }))}
                        placeholder="Stanford University"
                      />
                    </div>
                  </div>
                </div>

                <div className="trial-editor__verifier-edit-actions">
                  <button type="button" className="trial-editor__verify-btn" onClick={confirmVerify}>
                    <BadgeCheck size={16} /> Confirm verification
                  </button>
                  <button
                    type="button"
                    className="trial-editor__modal-cancel"
                    onClick={() => setShowVerifyModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ---------- TITLE & SUMMARY ---------- */}
      <section className="trial-editor__section">
        <div className="trial-editor__field">
          <label>Title</label>
          <input
            value={trial.short_title_manual ?? trial.short_title ?? ""}
            onChange={(e) => setTrial({ ...trial, short_title_manual: e.target.value })}
          />
          <button type="button" className="trial-editor__reset-btn" onClick={() => resetField("short_title_manual")}>
            Reset to original
          </button>
        </div>

        <div className="trial-editor__field">
          <label>Summary</label>
          <textarea
            rows={6}
            value={trial.ai_summary_manual ?? trial.ai_summary ?? ""}
            onChange={(e) => setTrial({ ...trial, ai_summary_manual: e.target.value })}
          />
          <button type="button" className="trial-editor__reset-btn" onClick={() => resetField("ai_summary_manual")}>
            Reset to original
          </button>
        </div>
      </section>

      {/* ---------- FINDINGS (only when completed) ---------- */}
      {isCompleted && (
        <section className="trial-editor__section">
          <h2>Study Findings (for completed trials)</h2>
          <div className="trial-editor__field">
            <label>Findings (simplified summary for patients)</label>
            <textarea
              rows={8}
              value={trial.findings ?? ""}
              onChange={(e) => setTrial({ ...trial, findings: e.target.value })}
              placeholder="Plain-language summary of what the study found. HTML allowed."
            />
          </div>
          <div className="trial-editor__field">
            <label>Findings URL (optional link to published paper)</label>
            <input
              type="url"
              value={trial.findings_url ?? ""}
              onChange={(e) => setTrial({ ...trial, findings_url: e.target.value })}
              placeholder="https://..."
            />
          </div>
        </section>
      )}

      {/* ---------- DEFAULT QUESTIONS ---------- */}
      <section className="trial-editor__section">
        <h2>Default Questions</h2>
        <p className="trial-editor__hint">
          Uncheck a question to hide it from the public page. Edit text below to override the AI-generated answer.
        </p>

        {DEFAULT_QUESTION_FIELDS.map(({ key, label, base, defaultKey }) => (
          <div className="trial-editor__field" key={key}>
            <label className="trial-editor__question-label">
              <input
                type="checkbox"
                checked={!hidden.has(defaultKey)}
                onChange={() => toggleHidden(defaultKey)}
              />
              <span>{label}</span>
            </label>
            <textarea
              rows={5}
              value={trial[key] ?? trial[base] ?? ""}
              onChange={(e) => setTrial({ ...trial, [key]: e.target.value })}
              disabled={hidden.has(defaultKey)}
            />
            <button type="button" className="trial-editor__reset-btn" onClick={() => resetField(key)}>
              Reset to original
            </button>
          </div>
        ))}
      </section>

      {/* ---------- CUSTOM QUESTIONS ---------- */}
      <section className="trial-editor__section">
        <h2>Custom Questions</h2>
        <p className="trial-editor__hint">
          Add your own Q&A pairs. They&apos;ll appear after the default questions in the order shown here. Drag to reorder.
        </p>
        <CustomQuestionsEditor
          questions={trial.custom_questions}
          onChange={(qs) => setTrial({ ...trial, custom_questions: qs })}
        />
      </section>

      {/* ---------- SAVE ---------- */}
<div className="trial-editor__actions">
  <button
    className="trial-editor__save"
    onClick={save}
    disabled={saving}
  >
    {saving ? (
      <>
        <Loader2 size={16} className="animate-spin" /> Saving…
      </>
    ) : (
      "Save Changes"
    )}
  </button>

  {mode === "researcher" && (
    <button
      type="button"
      className="trial-editor__verify-btn"
      onClick={submitForReview}
      style={{ marginLeft: "12px" }}
    >
      Submit for Review
    </button>
  )}
</div>
    </div>
  );
}
