import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { cookies } from "next/headers";
import { verify } from "jsonwebtoken";

export async function POST(req, { params }) {
  try {
    const { nctId } = await params;

    const cookieStore = await cookies();
    const token = cookieStore.get("auth")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const payload = verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );

    if (payload.role !== "researcher") {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const assignment = await sql`
      SELECT 1
      FROM trial_assignments
      WHERE researcher_id = ${payload.id}
      AND nct_id = ${nctId}
      LIMIT 1
    `;

    if (!assignment.length) {
      return NextResponse.json(
        { success: false, error: "Not assigned" },
        { status: 403 }
      );
    }

    // Record the "submitted for review" state in its own table — the trial's
    // workflow status is derived (verified → published, assigned → editing,
    // this row → review_submitted), so the clinical_trials schema is untouched.
    await sql`
      INSERT INTO trial_review_submissions (nct_id, submitted_by)
      VALUES (${nctId}, ${payload.id})
      ON CONFLICT (nct_id)
      DO UPDATE SET submitted_at = NOW(), submitted_by = ${payload.id}
    `;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}