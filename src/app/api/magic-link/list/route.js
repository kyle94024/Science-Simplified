import { NextResponse } from "next/server";
import { tenantQuery } from "@/lib/tenantDb";
import { tenant } from "@/lib/config";
import { sites } from "@/lib/sites";
import { requireAdmin } from "@/lib/adminGuard";

export async function GET(req) {

    const adminCheck = requireAdmin(req);
    if (adminCheck instanceof NextResponse) return adminCheck;

    // const TENANT_DOMAINS = {
    //     NF: "https://nfsimplified.com",
    //     EB: "https://sseb.vercel.app",
    //     Vitiligo: "https://ssvitiligo.vercel.app",
    //     CF: "https://sscf-coral.vercel.app",
    //     ALS: "https://ssals-ten.vercel.app",
    //     HS: "https://science-simplified-mu.vercel.app/",
    //     Ashermans: "https://ssashermans.vercel.app",
    //     RYR1: "https://ssryr1.vercel.app",
    //     Aicardi: "https://ssaicardi.vercel.app",
    //     Progeria: "https://ssprogeria.vercel.app",
    //     RETT: "https://ssrett.vercel.app",
    //     Canavan: "https://sscanavan.vercel.app",
    //     HUNTINGTONS: "https://sshuntingtons.vercel.app", 
    //   };
    const tenant_domain = tenant.domain;

    try {
        const allLinks = [];

        // Loop over all tenant keys (NF, EB, CF, HS, etc)
        const key = tenant.shortName;
        try {
            const result = await tenantQuery(
                key,
                "SELECT id, email, token_hash, redirect_url, created_at, used FROM magic_links ORDER BY created_at DESC"
            );

            // Add tenant field so admin UI knows which is which
            result.rows.forEach((row) => {
                allLinks.push({
                    ...row,
                    tenant: key,
                    url: `${tenant_domain}/api/magic-link/verify?tenant=${key}&token=__TOKEN__`
                });
            });
        } catch (e) {
            // Ignore tenants that do not have magic_links table yet
        }
        

        return NextResponse.json({ links: allLinks });
    } catch (error) {
        console.error("Error listing magic links:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
