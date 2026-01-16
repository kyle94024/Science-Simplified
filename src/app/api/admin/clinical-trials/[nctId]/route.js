import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";

/**GET single trial (admin)*/
export async function GET(req, { params }) {
  try {
    const nctId = params.nctId;

    const { searchParams } = new URL(req.url);
    const tenant = searchParams.get("tenant");

    if (!tenant) {
      return NextResponse.json({ error: "Missing tenant" }, { status: 400 });
    }

    const result = await sql`
      SELECT *
      FROM clinical_trials
      WHERE nct_id = ${nctId}
        AND tenant = ${tenant}
      LIMIT 1
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "Trial not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      trial: result[0],
    });
  } catch (err) {
    console.error("ADMIN TRIAL GET ERROR:", err);
    return NextResponse.json(
      { error: "Failed to load trial" },
      { status: 500 }
    );
  }
}

/**PATCH manual edits (admin)*/

export async function PATCH(req, { params }) {
  try {
    const nctId = params.nctId;

    const { searchParams } = new URL(req.url);
    const tenant = searchParams.get("tenant");

    if (!tenant) {
      return NextResponse.json({ error: "Missing tenant" }, { status: 400 });
    }

    const body = await req.json();

   
    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json(
        { error: "No fields provided" },
        { status: 400 }
      );
    }

    await sql`
      UPDATE clinical_trials
      SET
        short_title_manual        = ${body.short_title_manual ?? null},
        ai_summary_manual         = ${body.ai_summary_manual ?? null},
        ai_purpose_manual         = ${body.ai_purpose_manual ?? null},
        ai_treatments_manual      = ${body.ai_treatments_manual ?? null},
        ai_design_manual          = ${body.ai_design_manual ?? null},
        ai_eligibility_manual     = ${body.ai_eligibility_manual ?? null},
        ai_participation_manual   = ${body.ai_participation_manual ?? null},
        ai_leadership_manual      = ${body.ai_leadership_manual ?? null},
        ai_locations_manual       = ${body.ai_locations_manual ?? null},
        ai_prior_research_manual  = ${body.ai_prior_research_manual ?? null},
        updated_at = NOW()
      WHERE nct_id = ${nctId}
        AND tenant = ${tenant}
    `;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("ADMIN TRIAL PATCH ERROR:", err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
