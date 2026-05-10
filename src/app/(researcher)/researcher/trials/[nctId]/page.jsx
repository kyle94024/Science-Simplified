"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar/Navbar";
import Footer from "@/components/Footer/Footer";
import TrialEditor from "@/components/trials/TrialEditor";
import { withResearcherAuth } from "@/components/withResearcherAuth/withResearcherAuth";

function ResearcherTrialEdit() {
  const { nctId } = useParams();
  const tenant = process.env.NEXT_PUBLIC_SITE_KEY;

  return (
    <>
      <Navbar />
      <main style={{ padding: "2rem 1rem", background: "#f9fafb", minHeight: "calc(100vh - 100px)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto 1rem" }}>
          <Link
            href="/researcher/dashboard"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              color: "#6b7280",
              fontSize: "1.3rem",
              textDecoration: "none",
            }}
          >
            <ArrowLeft size={14} /> Back to dashboard
          </Link>
        </div>
        <TrialEditor nctId={nctId} tenant={tenant} mode="researcher" />
      </main>
      <Footer />
    </>
  );
}

export default withResearcherAuth(ResearcherTrialEdit);
