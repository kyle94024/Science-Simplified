"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar/Navbar";
import Footer from "@/components/Footer/Footer";
import { withAuth } from "@/components/withAuth/withAuth";
import { UserPlus, Mail, X, Loader2, Search } from "lucide-react";
import "./Researchers.scss";

function ResearchersPage() {
  const [researchers, setResearchers] = useState([]);
  const [allTrials, setAllTrials] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [selectedNctIds, setSelectedNctIds] = useState([]);
  const [trialSearch, setTrialSearch] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lastMagicUrl, setLastMagicUrl] = useState(null);

  useEffect(() => {
    loadResearchers();
    loadTrials();
  }, []);

  async function loadResearchers() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/trial-assignments");
      const data = await res.json();
      setResearchers(data.researchers || []);
    } catch (err) {
      console.error("Failed to load researchers:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadTrials() {
    try {
      const tenant = process.env.NEXT_PUBLIC_SITE_KEY;
      const res = await fetch(`/api/admin/clinical-trials?tenant=${tenant}`);
      const data = await res.json();
      setAllTrials(data.trials || []);
    } catch (err) {
      console.error("Failed to load trials:", err);
    }
  }

  async function handleInvite(e) {
    e.preventDefault();
    if (!email) return alert("Email required");
    setSubmitting(true);
    setLastMagicUrl(null);

    try {
      const res = await fetch("/api/admin/trial-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          firstName,
          lastName,
          nctIds: selectedNctIds,
          sendEmail,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Invite failed");
      alert(
        `Researcher invited!${data.assignedCount} trial${data.assignedCount === 1 ? "" : "s"} assigned.${sendEmail ? " Email sent." : ""}`
      );
      setLastMagicUrl(data.magicUrl);
      setEmail("");
      setFirstName("");
      setLastName("");
      setSelectedNctIds([]);
      setTrialSearch("");
      loadResearchers();
    } catch (err) {
      alert(`Invite failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function revokeAssignment(researcherId, nctId) {
    if (!confirm("Revoke this assignment?")) return;
    try {
      const res = await fetch("/api/admin/trial-assignments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ researcherId, nctId }),
      });
      if (!res.ok) throw new Error("Revoke failed");
      loadResearchers();
    } catch (err) {
      alert(`Failed: ${err.message}`);
    }
  }

  const filteredTrials = allTrials.filter((t) => {
    if (!trialSearch) return true;
    const q = trialSearch.toLowerCase();
    return (
      t.nct_id?.toLowerCase().includes(q) ||
      t.short_title?.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <Navbar />

      <main className="researchers-page">
        <div className="researchers-page__container">
          <header className="researchers-page__header">
            <h1>Researchers</h1>
            <p>Invite researchers to verify and edit specific clinical trials.</p>
          </header>

          {/* INVITE FORM */}
          <section className="researchers-page__section">
            <h2>
              <UserPlus size={20} /> Invite a researcher
            </h2>
            <form onSubmit={handleInvite} className="researchers-page__form">
              <div className="researchers-page__row">
                <input
                  type="email"
                  placeholder="researcher@institution.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <input
                  type="text"
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>

              <div className="researchers-page__trial-picker">
                <label>Assign trials</label>
                <div className="researchers-page__trial-search">
                  <Search size={14} />
                  <input
                    type="text"
                    placeholder="Search trials by title or NCT ID..."
                    value={trialSearch}
                    onChange={(e) => setTrialSearch(e.target.value)}
                  />
                </div>
                <div className="researchers-page__trial-list">
                  {filteredTrials.length === 0 ? (
                    <p className="researchers-page__empty">No trials found</p>
                  ) : (
                    filteredTrials.slice(0, 30).map((t) => (
                      <label key={t.nct_id} className="researchers-page__trial-row">
                        <input
                          type="checkbox"
                          checked={selectedNctIds.includes(t.nct_id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedNctIds([...selectedNctIds, t.nct_id]);
                            } else {
                              setSelectedNctIds(selectedNctIds.filter((id) => id !== t.nct_id));
                            }
                          }}
                        />
                        <span className="researchers-page__trial-nct">{t.nct_id}</span>
                        <span className="researchers-page__trial-title">{t.short_title}</span>
                      </label>
                    ))
                  )}
                </div>
                {selectedNctIds.length > 0 && (
                  <p className="researchers-page__selected-count">
                    {selectedNctIds.length} trial{selectedNctIds.length === 1 ? "" : "s"} selected
                  </p>
                )}
              </div>

              <div className="researchers-page__row">
                <label className="researchers-page__checkbox">
                  <input
                    type="checkbox"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                  />
                  Send invite email
                </label>
              </div>

              <button type="submit" className="researchers-page__submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Inviting…
                  </>
                ) : (
                  <>
                    <Mail size={16} /> Invite researcher
                  </>
                )}
              </button>

              {lastMagicUrl && (
                <div className="researchers-page__magic-link">
                  <strong>Magic link (you can also share manually):</strong>
                  <input type="text" readOnly value={lastMagicUrl} onClick={(e) => e.target.select()} />
                </div>
              )}
            </form>
          </section>

          {/* EXISTING RESEARCHERS */}
          <section className="researchers-page__section">
            <h2>Existing researchers</h2>
            {loading ? (
              <p>Loading…</p>
            ) : researchers.length === 0 ? (
              <p>No researchers yet.</p>
            ) : (
              <div className="researchers-page__researcher-list">
                {researchers.map((r) => (
                  <div key={r.id} className="researchers-page__researcher">
                    <div className="researchers-page__researcher-head">
                      <strong>{r.name || `${r.first_name || ""} ${r.last_name || ""}`.trim() || r.email}</strong>
                      <span className="researchers-page__researcher-email">{r.email}</span>
                    </div>
                    {r.assignments && r.assignments.length > 0 ? (
                      <ul className="researchers-page__assignments">
                        {r.assignments.map((a) => (
                          <li key={a.nctId}>
                            <span className="researchers-page__assignment-nct">{a.nctId}</span>
                            <span className="researchers-page__assignment-title">{a.shortTitle || "—"}</span>
                            <button
                              type="button"
                              className="researchers-page__revoke"
                              onClick={() => revokeAssignment(r.id, a.nctId)}
                              aria-label="Revoke"
                            >
                              <X size={14} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="researchers-page__no-assignments">No assignments yet.</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}

export default withAuth(ResearchersPage);
