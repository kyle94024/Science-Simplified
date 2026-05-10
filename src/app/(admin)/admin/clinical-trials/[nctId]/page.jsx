"use client";

import { useParams, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar/Navbar";
import Footer from "@/components/Footer/Footer";
import TrialEditor from "@/components/trials/TrialEditor";
import "./AdminTrialEdit.scss";

export default function AdminTrialEditPage() {
  const { nctId } = useParams();
  const searchParams = useSearchParams();
  const tenant = searchParams.get("tenant") || process.env.NEXT_PUBLIC_SITE_KEY;

  return (
    <>
      <Navbar />
      <main className="admin-edit">
        <TrialEditor nctId={nctId} tenant={tenant} mode="admin" />
      </main>
      <Footer />
    </>
  );
}
