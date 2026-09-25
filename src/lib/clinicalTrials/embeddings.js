// Clinical trials semantic search via OpenAI text-embedding-3-small + pgvector.
// Cost: ~$0.02 per 1M tokens. Backfilling ~500 trials × 17 tenants is well under $1.

import crypto from "crypto";
import openai from "@/lib/openai";
import { sql } from "@/lib/neon";
import { expandQueryForEmbedding } from "./searchVocabulary";

/** Results below this cosine similarity are noise, not matches. Calibrated on
 *  NF: real patient queries score 0.45–0.66, nonsense scores ≤ 0.12, and bare
 *  acronyms the model doesn't know ("STARFISH") score ~0.2. */
export const MIN_SIMILARITY = 0.35;
/** …and a result far weaker than the best one isn't a match either. */
const MAX_DROP_FROM_TOP = 0.2;

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIM = 1536;

/**
 * Build the text blob that gets embedded for a trial.
 * Includes the most patient-relevant fields so semantic search matches symptoms,
 * eligibility, and disease context — not metadata.
 */
function buildEmbeddingInput(trial) {
  // The registered title, acronym and keywords carry the clinical vocabulary
  // (STARFISH, "NF2-related schwannomatosis") that the patient-friendly rewrite
  // leaves out; without them a search for the trial's own name can't find it.
  const id = trial.raw_data?.protocolSection?.identificationModule || {};
  const cm = trial.raw_data?.protocolSection?.conditionsModule || {};
  const keywords = trial.keywords ?? cm.keywords;
  const parts = [
    trial.short_title || trial.short_title_manual || "",
    [trial.brief_title || id.briefTitle, trial.acronym || id.acronym]
      .filter(Boolean)
      .join(" — "),
    trial.official_title || id.officialTitle || "",
    trial.ai_summary || trial.ai_summary_manual || "",
    trial.ai_eligibility || trial.ai_eligibility_manual || "",
    Array.isArray(trial.conditions) ? trial.conditions.join(", ") : "",
    Array.isArray(keywords) ? keywords.join(", ") : "",
  ].filter(Boolean);
  return parts.join("\n\n");
}

/**
 * Generate (or skip-via-hash) an embedding for one trial and store it.
 * @param {object} trial - row from clinical_trials with nct_id, short_title, ai_summary, ai_eligibility, conditions
 * @returns {{ status: 'generated' | 'skipped' | 'empty' | 'error', error?: string }}
 */
export async function generateEmbedding(trial) {
  const input = buildEmbeddingInput(trial);
  if (!input.trim() || input.trim().length < 30) {
    return { status: "empty" };
  }

  const inputHash = crypto.createHash("sha256").update(input).digest("hex");
  if (trial.embedding_source_hash === inputHash) {
    return { status: "skipped" };
  }

  try {
    const res = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input,
    });
    const embedding = res.data[0].embedding;
    if (!embedding || embedding.length !== EMBEDDING_DIM) {
      return { status: "error", error: "unexpected embedding dimension" };
    }

    // pgvector accepts the literal "[0.1,0.2,...]" string format
    const vectorLiteral = "[" + embedding.join(",") + "]";

    await sql`
      UPDATE clinical_trials
      SET embedding = ${vectorLiteral}::vector,
          embedding_source_hash = ${inputHash}
      WHERE nct_id = ${trial.nct_id}
    `;
    return { status: "generated" };
  } catch (err) {
    return { status: "error", error: err.message };
  }
}

/**
 * Generate embeddings for many trials with bounded concurrency.
 * @param {Array} trials
 * @param {number} concurrency - default 5
 * @param {(progress: { done, total, status, nctId }) => void} onProgress - optional callback per trial
 */
export async function generateEmbeddingsBatched(trials, concurrency = 5, onProgress) {
  let done = 0;
  const total = trials.length;
  const results = { generated: 0, skipped: 0, empty: 0, error: 0 };

  for (let i = 0; i < trials.length; i += concurrency) {
    const batch = trials.slice(i, i + concurrency);
    const settled = await Promise.allSettled(
      batch.map(async (t) => {
        const r = await generateEmbedding(t);
        done++;
        if (onProgress) onProgress({ done, total, status: r.status, nctId: t.nct_id });
        return r;
      })
    );
    settled.forEach((s) => {
      if (s.status === "fulfilled") {
        results[s.value.status] = (results[s.value.status] || 0) + 1;
      } else {
        results.error++;
      }
    });
  }

  return results;
}

/**
 * Semantic search trials by free-text query.
 * @param {string} tenant - tenant key (case-insensitive matched)
 * @param {string} query - natural-language patient description
 * @param {object} opts
 * @param {number} opts.limit - max results (default 20)
 * @param {boolean} opts.includeArchived - include archived/completed trials (default false)
 * @returns {Array<object>} trials with similarity score 0-1 ordered desc
 */
export async function semanticSearchTrials(tenant, query, opts = {}) {
  const {
    limit = 20,
    includeArchived = false,
    minSimilarity = MIN_SIMILARITY,
    maxDropFromTop = MAX_DROP_FROM_TOP,
  } = opts;
  if (!query || !query.trim()) return [];

  // Embed the query, with known synonyms spelled out ("NF2-SWN" → also
  // "NF2-related schwannomatosis, neurofibromatosis type 2, …").
  const res = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: expandQueryForEmbedding(query.trim(), tenant),
  });
  const queryEmbedding = res.data[0].embedding;
  const vectorLiteral = "[" + queryEmbedding.join(",") + "]";

  // Cosine similarity: 1 - (embedding <=> query)
  // Note: pgvector's <=> is cosine distance (0 = identical, 2 = opposite); similarity = 1 - distance
  const rows = includeArchived
    ? await sql`
        SELECT
          nct_id,
          COALESCE(short_title_manual, short_title) AS short_title,
          COALESCE(ai_summary_manual, ai_summary) AS ai_summary,
          conditions,
          keywords,
          raw_data->'protocolSection'->'identificationModule'->>'briefTitle' AS brief_title,
          raw_data->'protocolSection'->'identificationModule'->>'officialTitle' AS official_title,
          raw_data->'protocolSection'->'identificationModule'->>'acronym' AS acronym,
          overall_status,
          verified_by,
          archive_reason,
          is_active,
          raw_data->'protocolSection'->'contactsLocationsModule'->'locations'
            AS locations,
          raw_data->'protocolSection'->'eligibilityModule'->>'minimumAge' AS min_age,
          raw_data->'protocolSection'->'eligibilityModule'->>'maximumAge' AS max_age,
          LOWER(raw_data->'protocolSection'->'designModule'->>'studyType') AS study_type,
          1 - (embedding <=> ${vectorLiteral}::vector) AS similarity
        FROM clinical_trials
        WHERE LOWER(tenant) = LOWER(${tenant})
          AND embedding IS NOT NULL
        ORDER BY embedding <=> ${vectorLiteral}::vector
        LIMIT ${limit}
      `
    : await sql`
        SELECT
          nct_id,
          COALESCE(short_title_manual, short_title) AS short_title,
          COALESCE(ai_summary_manual, ai_summary) AS ai_summary,
          conditions,
          keywords,
          raw_data->'protocolSection'->'identificationModule'->>'briefTitle' AS brief_title,
          raw_data->'protocolSection'->'identificationModule'->>'officialTitle' AS official_title,
          raw_data->'protocolSection'->'identificationModule'->>'acronym' AS acronym,
          overall_status,
          verified_by,
          archive_reason,
          is_active,
          raw_data->'protocolSection'->'contactsLocationsModule'->'locations'
            AS locations,
          raw_data->'protocolSection'->'eligibilityModule'->>'minimumAge' AS min_age,
          raw_data->'protocolSection'->'eligibilityModule'->>'maximumAge' AS max_age,
          LOWER(raw_data->'protocolSection'->'designModule'->>'studyType') AS study_type,
          1 - (embedding <=> ${vectorLiteral}::vector) AS similarity
        FROM clinical_trials
        WHERE LOWER(tenant) = LOWER(${tenant})
          AND embedding IS NOT NULL
          AND is_active = true
          AND overall_status IN ('RECRUITING', 'ENROLLING_BY_INVITATION')
        ORDER BY embedding <=> ${vectorLiteral}::vector
        LIMIT ${limit}
      `;

  // pgvector always returns the nearest N; "nearest" is not "relevant". Keep
  // only genuine matches so an off-topic query yields nothing rather than a
  // list of unrelated trials.
  const top = rows.length ? Number(rows[0].similarity) : 0;
  return rows.filter((r) => {
    const s = Number(r.similarity);
    return s >= minSimilarity && s >= top - maxDropFromTop;
  });
}
