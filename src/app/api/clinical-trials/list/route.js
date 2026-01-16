export async function GET(req) {
  const { searchParams } = new URL(req.url);

  const page = Number(searchParams.get("page") || 1);
  const limit = 6;
  const offset = (page - 1) * limit;
  const q = searchParams.get("q") || "";

  const tenant = process.env.NEXT_PUBLIC_SITE_KEY;
  if (!tenant) {
    return NextResponse.json(
      { success: false, error: "Missing tenant" },
      { status: 400 }
    );
  }

  const trials = await sql`
  SELECT
    nct_id,
    overall_status,
    COALESCE(ai_summary_manual, ai_summary) AS ai_summary
  FROM clinical_trials
  WHERE is_active = true
    AND tenant = ${tenant}
    AND (
      nct_id ILIKE ${"%" + q + "%"}
      OR COALESCE(ai_summary_manual, ai_summary) ILIKE ${"%" + q + "%"}
    )
  ORDER BY last_synced_at DESC
  LIMIT ${limit}
  OFFSET ${offset}
`;

  return NextResponse.json({
    success: true,
    trials,
    total: Number(total[0].count),
    page,
  });
}
