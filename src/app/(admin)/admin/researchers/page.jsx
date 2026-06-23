"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar/Navbar";
import Footer from "@/components/Footer/Footer";
import { withAuth } from "@/components/withAuth/withAuth";
import { UserPlus, Mail, X, Loader2, Search, BadgeCheck, FileText, Microscope } from "lucide-react";
import "./Researchers.scss";

function ResearchersPage() {
  const [researchers, setResearchers] = useState([]);
  const [allTrials, setAllTrials] = useState([]);
  const [allArticles, setAllArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [selectedNctIds, setSelectedNctIds] = useState([]);
  const [selectedArticleIds, setSelectedArticleIds] = useState([]);
  const [trialSearch, setTrialSearch] = useState("");
  const [articleSearch, setArticleSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastMagicUrl, setLastMagicUrl] = useState(null);
  const [activeTab, setActiveTab] = useState("trials"); // "trials" or "articles"

  useEffect(() => {
    loadResearchers();
    loadTrials();
    loadArticles();
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

  async function loadArticles() {
    try {
      // Pending articles are the ones awaiting review/certification — these are
      // what you assign to an expert. (Published/certified articles are done.)
      const res = await fetch(`/api/articles/pending`);
      const data = await res.json();
      setAllArticles(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load articles:", err);
    }
  }

  async function handleInvite(e) {
    e.preventDefault();
    if (!email) return alert("Email required");
    if (selectedNctIds.length === 0 && selectedArticleIds.length === 0) {
      if (!confirm("No trials or articles selected. Send invite anyway?")) return;
    }
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
          articleIds: selectedArticleIds,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Invite failed");
      alert(
        `Expert assigned! ${data.assignedTrials} trial${data.assignedTrials === 1 ? "" : "s"} and ${data.assignedArticles} article${data.assignedArticles === 1 ? "" : "s"} assigned. Share the magic link below if they need access.`
      );
      setLastMagicUrl(data.magicUrl);
      setEmail("");
      setFirstName("");
      setLastName("");
      setSelectedNctIds([]);
      setSelectedArticleIds([]);
      setTrialSearch("");
      setArticleSearch("");
      loadResearchers();
    } catch (err) {
      alert(`Invite failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function revokeTrialAssignment(researcherId, nctId) {
    if (!confirm("Revoke this trial assignment?")) return;
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

  async function revokeArticleAssignment(researcherId, articleId) {
    if (!confirm("Revoke this article assignment?")) return;
    try {
      const res = await fetch("/api/admin/trial-assignments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ researcherId, articleId }),
      });
      if (!res.ok) throw new Error("Revoke failed");
      loadResearchers();
    } catch (err) {
      alert(`Failed: ${err.message}`);
    }
  }

  // Only actively-recruiting trials are worth assigning for verification.
  const ACTIVELY_RECRUITING = ["RECRUITING", "ENROLLING_BY_INVITATION"];

  const filteredTrials = allTrials.filter((t) => {
    if (t.verified_by) return false; // already verified — nothing to assign
    if (!ACTIVELY_RECRUITING.includes(t.overall_status)) return false; // recruiting only
    if (!trialSearch) return true;
    const q = trialSearch.toLowerCase();
    return (
      t.nct_id?.toLowerCase().includes(q) ||
      t.short_title?.toLowerCase().includes(q)
    );
  });

  const filteredArticles = allArticles.filter((a) => {
    if (!articleSearch) return true;
    const q = articleSearch.toLowerCase();
    return (
      a.title?.toLowerCase().includes(q) ||
      a.summary?.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <Navbar />

      <main className="researchers-page">
        <div className="researchers-page__container">
          <header className="researchers-page__header">
            <h1>Experts &amp; Researchers</h1>
            <p>Invite experts to verify clinical trials and certify articles.</p>
          </header>

          {/* INVITE FORM */}
          <section className="researchers-page__section">
            <h2>
              <UserPlus size={20} /> Invite an expert
            </h2>
            <form onSubmit={handleInvite} className="researchers-page__form">
              <div className="researchers-page__row">
                <input
                  type="email"
                  placeholder="expert@institution.edu"
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

              {/* TABS: Trials / Articles */}
              <div className="researchers-page__tabs">
                <button
                  type="button"
                  className={`researchers-page__tab ${activeTab === "trials" ? "researchers-page__tab--active" : ""}`}
                  onClick={() => setActiveTab("trials")}
                >
                  <Microscope size={14} /> Clinical Trials
                  {selectedNctIds.length > 0 && (
                    <span className="researchers-page__tab-count">{selectedNctIds.length}</span>
                  )}
                </button>
                <button
                  type="button"
                  className={`researchers-page__tab ${activeTab === "articles" ? "researchers-page__tab--active" : ""}`}
                  onClick={() => setActiveTab("articles")}
                >
                  <FileText size={14} /> Articles
                  {selectedArticleIds.length > 0 && (
                    <span className="researchers-page__tab-count">{selectedArticleIds.length}</span>
                  )}
                </button>
              </div>

              {activeTab === "trials" && (
                <div className="researchers-page__trial-picker">
                  <label>Assign clinical trials</label>
                  <p className="researchers-page__picker-hint">
                    Only actively-recruiting trials that aren&apos;t verified yet are shown.
                  </p>
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
              )}

              {activeTab === "articles" && (
                <div className="researchers-page__trial-picker">
                  <label>Assign articles for verification</label>
                  <p className="researchers-page__picker-hint">
                    Articles awaiting review (pending) are shown.
                  </p>
                  <div className="researchers-page__trial-search">
                    <Search size={14} />
                    <input
                      type="text"
                      placeholder="Search articles by title..."
                      value={articleSearch}
                      onChange={(e) => setArticleSearch(e.target.value)}
                    />
                  </div>
                  <div className="researchers-page__trial-list">
                    {filteredArticles.length === 0 ? (
                      <p className="researchers-page__empty">No articles found</p>
                    ) : (
                      filteredArticles.slice(0, 30).map((a) => (
                        <label key={a.id} className="researchers-page__trial-row">
                          <input
                            type="checkbox"
                            checked={selectedArticleIds.includes(a.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedArticleIds([...selectedArticleIds, a.id]);
                              } else {
                                setSelectedArticleIds(selectedArticleIds.filter((id) => id !== a.id));
                              }
                            }}
                          />
                          <span className="researchers-page__trial-nct">#{a.id}</span>
                          <span className="researchers-page__trial-title">{a.title}</span>
                        </label>
                      ))
                    )}
                  </div>
                  {selectedArticleIds.length > 0 && (
                    <p className="researchers-page__selected-count">
                      {selectedArticleIds.length} article{selectedArticleIds.length === 1 ? "" : "s"} selected
                    </p>
                  )}
                </div>
              )}

              <button type="submit" className="researchers-page__submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Inviting…
                  </>
                ) : (
                  <>
                    <Mail size={16} /> Invite expert
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

          {/* EXISTING EXPERTS */}
          <section className="researchers-page__section">
            <h2>Existing experts</h2>
            {loading ? (
              <p>Loading…</p>
            ) : researchers.length === 0 ? (
              <p>No experts yet.</p>
            ) : (
              <div className="researchers-page__researcher-list">
                {researchers.map((r) => {
                  const trialAssignments = r.trialAssignments || [];
                  const articleAssignments = r.articleAssignments || [];
                  const totalCount = trialAssignments.length + articleAssignments.length;
                  return (
                    <div key={r.id} className="researchers-page__researcher">
                      <div className="researchers-page__researcher-head">
                        <strong>{r.name || `${r.first_name || ""} ${r.last_name || ""}`.trim() || r.email}</strong>
                        <span className="researchers-page__researcher-email">{r.email}</span>
                        {totalCount > 0 && (
                          <span className="researchers-page__researcher-count">
                            {totalCount} assignment{totalCount === 1 ? "" : "s"}
                          </span>
                        )}
                      </div>

                      {trialAssignments.length > 0 && (
                        <>
                          <div className="researchers-page__group-header">
                            <Microscope size={14} /> Trials ({trialAssignments.length})
                          </div>
                          <ul className="researchers-page__assignments">
                            {trialAssignments.map((a) => (
                              <li key={`t-${a.nctId}`}>
                                <span className="researchers-page__assignment-nct">{a.nctId}</span>
                                <span className="researchers-page__assignment-title">{a.shortTitle || "—"}</span>
                                {a.isVerified && (
                                  <span className="researchers-page__pill researchers-page__pill--verified">
                                    <BadgeCheck size={10} /> Verified
                                  </span>
                                )}
                                <button
                                  type="button"
                                  className="researchers-page__revoke"
                                  onClick={() => revokeTrialAssignment(r.id, a.nctId)}
                                  aria-label="Revoke"
                                >
                                  <X size={14} />
                                </button>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}

                      {articleAssignments.length > 0 && (
                        <>
                          <div className="researchers-page__group-header">
                            <FileText size={14} /> Articles ({articleAssignments.length})
                          </div>
                          <ul className="researchers-page__assignments">
                            {articleAssignments.map((a) => (
                              <li key={`a-${a.articleId}`}>
                                <span className="researchers-page__assignment-nct">#{a.articleId}</span>
                                <span className="researchers-page__assignment-title">{a.title || "—"}</span>
                                {a.isCertified ? (
                                  <span className="researchers-page__pill researchers-page__pill--verified">
                                    <BadgeCheck size={10} /> Certified
                                  </span>
                                ) : a.isPublished ? (
                                  <span className="researchers-page__pill researchers-page__pill--pending">
                                    Awaiting cert
                                  </span>
                                ) : (
                                  <span className="researchers-page__pill researchers-page__pill--pending">
                                    Pending
                                  </span>
                                )}
                                <button
                                  type="button"
                                  className="researchers-page__revoke"
                                  onClick={() => revokeArticleAssignment(r.id, a.articleId)}
                                  aria-label="Revoke"
                                >
                                  <X size={14} />
                                </button>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}

                      {totalCount === 0 && (
                        <p className="researchers-page__no-assignments">No assignments yet.</p>
                      )}
                    </div>
                  );
                })}
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
