"use client";

import { useState, useEffect } from "react";
import { siteKeys } from "@/lib/siteKeys";
import { tenant as defaultTenant } from "@/lib/config";
import { withAuth } from "@/components/withAuth/withAuth";

// Tenant → Domain mapping
// const TENANT_DOMAINS = {
//   NF: "https://nfsimplified.com",
//   EB: "https://sseb.vercel.app",
//   Vitiligo: "https://ssvitiligo.vercel.app",
//   CF: "https://sscf-coral.vercel.app",
//   ALS: "https://ssals-ten.vercel.app",
//   HS: "https://science-simplified-mu.vercel.app",
//   Ashermans: "https://ssashermans.vercel.app",
//   RYR1: "https://ssryr1.vercel.app",
//   Aicardi: "https://ssaicardi.vercel.app",
//   Progeria: "https://ssprogeria.vercel.app",
//   RETT: "https://ssrett.vercel.app",
//   Canavan: "https://sscanavan.vercel.app",
//   HUNTINGTONS: "https://sshuntingtons.vercel.app",
// };
const tenant_domain = defaultTenant.domain;

export default withAuth(function MagicLinksAdminPage() {
  // 👇 Correct local state for tenant
  const [tenantName, setTenantName] = useState(defaultTenant.shortName);  
  const [email, setEmail] = useState("");
  const [redirectUrl, setRedirectUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [links, setLinks] = useState([]);
  const [fetching, setFetching] = useState(true);

  // 🚀 Fetch links based on parameter not state
  async function fetchLinks(fetchTenant = tenantName) {
    setFetching(true);
    const res = await fetch(`/api/magic-link/list?tenant=${fetchTenant}`);
    const data = await res.json();
    setLinks(data.links || []);
    setFetching(false);
  }

  // 🔁 Auto-update when tenant changes
  useEffect(() => {
    if (tenantName) {
      const domain = defaultTenant.domain;
      setRedirectUrl(`${domain}/assigned-articles`);
      fetchLinks(tenantName); // 👈 direct parameter
    }
  }, [tenantName]);

  // ✨ Correct POST request including selected tenantName
  async function generateLink() {
    setLoading(true);
    await fetch("/api/magic-link/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenant: tenantName, // ⬅ correct
        email,
        redirectUrl,
      }),
    });
    setLoading(false);
    fetchLinks(tenantName);
  }

  async function deleteLink(id, linkTenant) {
    await fetch(`/api/magic-link/delete?id=${id}&tenant=${linkTenant}`, {
      method: "DELETE",
    });
    fetchLinks(tenantName);
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-800">Magic Link Admin</h1>

      {/* Create Form */}
      <div className="bg-white p-6 rounded-xl shadow border">
        <h2 className="text-xl font-semibold mb-4">Generate Magic Link</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Tenant */}
          <div>
            <label className="block text-sm font-medium mb-1">Tenant</label>
            <select
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)} // 👈 correct setter
              className="w-full p-3 border rounded-lg bg-white"
            >
              {siteKeys.map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              className="w-full p-3 border rounded-lg"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Redirect */}
          <div>
            <label className="block text-sm font-medium mb-1">Redirect URL</label>
            <input
              type="text"
              className="w-full p-3 border rounded-lg bg-gray-100"
              value={redirectUrl}
              disabled
            />
          </div>
        </div>

        <button
          onClick={generateLink}
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg shadow"
        >
          {loading ? "Generating..." : "Generate Magic Link"}
        </button>
      </div>

      {/* Link List */}
      <div className="bg-white p-6 rounded-xl shadow border">
        <h2 className="text-xl font-semibold mb-4">Existing Links ({tenantName})</h2>

        {fetching ? (
          <p>Loading...</p>
        ) : links.length > 0 ? (
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left border-b">
                <th className="p-2">Email</th>
                <th className="p-2">Tenant</th>
                <th className="p-2">Status</th>
                <th className="p-2">Created</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {links.map((link) => (
                <tr key={link.id} className="border-b">
                  <td className="p-2">{link.email}</td>
                  <td className="p-2">{link.tenant}</td>
                  <td className="p-2">
                    {link.used ? (
                      <span className="text-red-600 font-medium">Used</span>
                    ) : (
                      <span className="text-green-600 font-medium">Active</span>
                    )}
                  </td>
                  <td className="p-2">
                    {new Date(link.created_at).toLocaleString()}
                  </td>
                  <td className="p-2 space-x-2">
                    <button
                      className="text-blue-600"
                      onClick={() => navigator.clipboard.writeText(link.url)}
                    >
                      Copy
                    </button>
                    <button
                      className="text-red-600"
                      onClick={() => deleteLink(link.id, link.tenant)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No magic links for this tenant.</p>
        )}
      </div>
    </div>
  );
});
