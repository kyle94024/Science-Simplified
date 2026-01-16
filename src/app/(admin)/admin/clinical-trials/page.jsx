"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar/Navbar";
import Footer from "@/components/Footer/Footer";
import "./AdminTrials.scss";

const TENANTS = ["HS", "NF", "EB"]; // Add other tenants as needed

export default function AdminTrialsPage() {
  const [tenant, setTenant] = useState("HS");
  const [trials, setTrials] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const res = await fetch(`/api/admin/clinical-trials?tenant=${tenant}`, {
        cache: "no-store",
      });
      const data = await res.json();

      if (!cancelled) {
        setTrials(data.trials || []);
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [tenant]);

  return (
    <>
      <Navbar />

      <main className="admin-trials">
        <div className="admin-trials__container">
          {/* HEADER */}
          <div className="admin-trials__header">
            <h1 className="admin-trials__title">Clinical Trials (Admin)</h1>

            <div className="admin-trials__tenant-select">
              <label htmlFor="tenant">Tenant</label>
              <select
                id="tenant"
                value={tenant}
                onChange={(e) => setTenant(e.target.value)}
              >
                {TENANTS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* CONTENT */}
          {loading ? (
            <p>Loading trials…</p>
          ) : trials.length === 0 ? (
            <p>No trials found for {tenant}</p>
          ) : (
            <ul className="admin-trials__list">
              {trials.map((trial) => (
                <li
                  key={`${tenant}-${trial.nct_id}`} // ✅ FIXED
                  className="admin-trials__item"
                >
                  <Link
                    href={`/admin/clinical-trials/${trial.nct_id}?tenant=${tenant}`}
                    className="admin-trials__link"
                  >
                    {trial.short_title || trial.nct_id}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
