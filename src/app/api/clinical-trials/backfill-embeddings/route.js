import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { requireAdmin } from "@/lib/adminGuard";
import { generateEmbedding } from "@/lib/clinicalTrials/embeddings";

/**
 * SSE-streamed backfill of embeddings for trials missing one.
 * Admin only. Iterates all trials for current tenant where embedding IS NULL.
 */
export async function GET(req) {
  const authResult = requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  const tenant = process.env.NEXT_PUBLIC_SITE_KEY;
  if (!tenant) {
    return new Response(
      JSON.stringify({ success: false, error: "Missing tenant" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

      try {
        const trials = await sql`
          SELECT nct_id, short_title, short_title_manual, ai_summary, ai_summary_manual,
                 ai_eligibility, ai_eligibility_manual, conditions, embedding_source_hash
          FROM clinical_trials
          WHERE LOWER(tenant) = LOWER(${tenant})
            AND embedding IS NULL
        `;

        send({
          type: "status",
          message: `Found ${trials.length} trials needing embeddings`,
          total: trials.length,
        });

        let generated = 0;
        let skipped = 0;
        let errors = 0;
        let empty = 0;

        // Concurrency-bounded
        for (let i = 0; i < trials.length; i += 5) {
          const batch = trials.slice(i, i + 5);
          const results = await Promise.allSettled(
            batch.map((t) => generateEmbedding(t))
          );
          results.forEach((r, idx) => {
            const t = batch[idx];
            if (r.status === "fulfilled") {
              if (r.value.status === "generated") generated++;
              else if (r.value.status === "skipped") skipped++;
              else if (r.value.status === "empty") empty++;
              else errors++;
              send({
                type: "progress",
                nctId: t.nct_id,
                status: r.value.status,
                current: i + idx + 1,
                total: trials.length,
                percent: Math.round(((i + idx + 1) / trials.length) * 100),
              });
            } else {
              errors++;
              send({
                type: "error",
                nctId: t.nct_id,
                message: r.reason?.message || "unknown",
              });
            }
          });
        }

        send({
          type: "complete",
          message: "Backfill complete!",
          generated,
          skipped,
          empty,
          errors,
          total: trials.length,
        });
        controller.close();
      } catch (err) {
        send({ type: "fatal", message: err.message });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
