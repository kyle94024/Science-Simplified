"use client";

import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar/Navbar";
import Footer from "@/components/Footer/Footer";
import TrialEditor from "@/components/trials/TrialEditor";
import { tenant } from "@/lib/config";
import "./AdminTrialEdit.scss";

export default function AdminTrialEditPage() {
  const { nctId } = useParams();

  // Each deployment is single-tenant — always use the current deployment's tenant.
  // (Ignore URL ?tenant=… param, which may be stale from older links.)
  const tenantKey = tenant.shortName;

  return (
    <>
      <Navbar />
      <main className="admin-edit">
        <TrialEditor nctId={nctId} tenant={tenantKey} mode="admin" />
      </main>
      <Footer />
    </>
  );
}
