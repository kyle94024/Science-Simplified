import { sql } from "../src/lib/neon.js";

function generateShortTitle(summary) {
  if (!summary) return null;

  // Simple, predictable cleanup
  const stopWords = new Set([
    "this", "clinical", "trial", "study", "focused",
    "investigating", "evaluating", "designed", "aims",
    "to", "the", "of", "for", "and", "is"
  ]);

  const words = summary
    .replace(/[^\w\s]/g, "")
    .toLowerCase()
    .split(" ")
    .filter(w => w.length > 2 && !stopWords.has(w));

  const title = words.slice(0, 4).join(" ");
  return title
    ? title.replace(/\b\w/g, c => c.toUpperCase())
    : null;
}

async function run() {
  const trials = await sql`
    SELECT id, ai_summary
    FROM clinical_trials
    WHERE short_title IS NULL
      AND ai_summary IS NOT NULL
    LIMIT 100
  `;

  for (const trial of trials) {
    const shortTitle = generateShortTitle(trial.ai_summary);

    if (!shortTitle) continue;

    await sql`
      UPDATE clinical_trials
      SET short_title = ${shortTitle}
      WHERE id = ${trial.id}
    `;
  }

  console.log("✅ Short titles generated");
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});