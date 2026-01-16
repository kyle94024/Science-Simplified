import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import OpenAI from "openai";
import crypto from "crypto";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generatePatientSummary(trial) {
  const protocol = trial.protocolSection;

  const prompt = `
Summarize this clinical trial for patients in simple language.

Title: ${protocol.identificationModule?.briefTitle}
Conditions: ${protocol.conditionsModule?.conditions?.join(", ")}
Eligibility: ${protocol.eligibilityModule?.eligibilityCriteria}
Locations: ${protocol.contactsLocationsModule?.locations
    ?.map((l) => `${l.city}, ${l.country}`)
    .join("; ")}

Summary:
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
  });

  return response.choices[0].message.content.trim();
}

export async function POST(req, { params }) {
  const { nctId } = params;

  const rows = await sql`
    SELECT raw_data
    FROM clinical_trials
    WHERE nct_id = ${nctId}
    LIMIT 1
  `;

  if (!rows.length) {
    return NextResponse.json({ error: "Trial not found" }, { status: 404 });
  }

  const trial = rows[0].raw_data;
  const aiSummary = await generatePatientSummary(trial);

  const sourceHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(trial))
    .digest("hex");

  await sql`
    UPDATE clinical_trials
    SET
      ai_summary = ${aiSummary},
      source_hash = ${sourceHash},
      ai_summary_updated_at = NOW()
    WHERE nct_id = ${nctId}
  `;

  return NextResponse.json({ success: true });
}