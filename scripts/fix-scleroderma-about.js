/**
 * One-off fix for the Scleroderma "About" page config stored in the tenant DB.
 *
 * WHY: The About page reads `about_page_config` (saved via the admin CMS) FIRST,
 * falling back to sites.js defaults only if no row exists. Scleroderma has a
 * saved row whose Team section still contains "Hannah Young" (SRF) and an
 * "Expert Advisor Placeholder" — so sites.js changes have no effect. This
 * script surgically edits that row:
 *   1. Team section → keep only Science Simplified people (drops SRF folks +
 *      placeholders). Kyle Wan stays.
 *   2. Ensures the "Partnership" narrative section (Science Simplified × SRF)
 *      exists, inserted right after the Mission section.
 * Everything else in the saved config is left untouched.
 *
 * SAFETY: dry-run by default — prints the plan and writes nothing. Re-run with
 * `--apply` to commit. Your DB credentials stay on your machine; this script is
 * meant to be run by you locally, never by the agent.
 *
 * USAGE (from the repo root):
 *   node scripts/fix-scleroderma-about.js            # dry run, shows the diff
 *   node scripts/fix-scleroderma-about.js --apply    # actually writes
 *
 * It auto-discovers the Scleroderma connection string from .env.tenants / .env
 * (any var whose NAME or VALUE references "scleroderma"). If it can't find one,
 * set it explicitly:
 *   SCLERODERMA_DB_URL="postgres://..." node scripts/fix-scleroderma-about.js --apply
 */
const fs = require("fs");
const path = require("path");
const { neon } = require("@neondatabase/serverless");

const APPLY = process.argv.includes("--apply");

// ── Load env files (.env.tenants, .env) from a few candidate locations ────────
function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim().replace(/^['"]|['"]$/g, "");
    if (!(key in process.env)) process.env[key] = val;
  }
}
const here = __dirname;
const candidates = [
  path.join(here, "..", ".env.tenants"),
  path.join(here, "..", ".env"),
  path.join(here, "..", "..", "..", "..", ".env.tenants"), // main repo when run from a worktree
  path.join(here, "..", "..", "..", "..", ".env"),
  path.join(process.cwd(), ".env.tenants"),
  path.join(process.cwd(), ".env"),
];
candidates.forEach(loadEnvFile);

// ── Find the Scleroderma connection string ───────────────────────────────────
function findConnString() {
  if (process.env.SCLERODERMA_DB_URL) return process.env.SCLERODERMA_DB_URL;
  const isPg = (v) => typeof v === "string" && /^postgres(ql)?:\/\//.test(v);
  // Prefer a var whose NAME references scleroderma
  for (const [k, v] of Object.entries(process.env)) {
    if (/scleroderma/i.test(k) && isPg(v)) return v;
  }
  // Otherwise a connection string whose VALUE references scleroderma
  for (const v of Object.values(process.env)) {
    if (isPg(v) && /scleroderma/i.test(v)) return v;
  }
  return null;
}

// ── The partnership section to ensure is present ──────────────────────────────
const PARTNERSHIP_SECTION = {
  id: "partnership-db",
  type: "partnership",
  visible: true,
  content: {
    title: "In Partnership with the Scleroderma Research Foundation",
    body:
      "<p>Scleroderma Simplified is a <strong>Science Simplified</strong> platform — an independent initiative dedicated to making complex medical research understandable for everyone. We're proud to collaborate with the <strong>Scleroderma Research Foundation (SRF)</strong>, the nation's leading nonprofit investor in scleroderma research.</p>" +
      "<p>Through this partnership, Science Simplified translates the latest peer-reviewed scleroderma research into clear, expert-reviewed summaries — helping patients, families, and caregivers stay informed about the science shaping their care. Science Simplified builds and maintains this platform; the Scleroderma Research Foundation helps connect it with the community it serves.</p>",
    logoUrl: "",
    logoAlt: "Scleroderma Research Foundation",
    ctaText: "Visit the Scleroderma Research Foundation",
    ctaLink: "https://srfcure.org/",
  },
};

// A team member is dropped if it's a placeholder or clearly an SRF representative.
function shouldDropMember(m) {
  const name = (m.name || "").toLowerCase();
  const title = (m.title || "").toLowerCase();
  if (/placeholder/.test(name) || /placeholder/.test(title)) return true;
  if (/scleroderma research foundation/.test(title)) return true; // SRF folks
  if (/\bsrf\b/.test(title)) return true;
  return false;
}

(async function main() {
  const conn = findConnString();
  if (!conn) {
    console.error(
      "❌ Could not find a Scleroderma DB connection string.\n" +
        "   Set it explicitly, e.g.:\n" +
        '   SCLERODERMA_DB_URL="postgres://..." node scripts/fix-scleroderma-about.js --apply'
    );
    process.exit(1);
  }
  const sql = neon(conn);

  const rows = await sql`SELECT id, sections FROM about_page_config LIMIT 1`;
  if (rows.length === 0) {
    console.log(
      "✓ No saved about_page_config row — the site is already using sites.js defaults (Kyle-only team + partnership). Nothing to do."
    );
    return;
  }

  const id = rows[0].id;
  const sections = rows[0].sections;
  if (!Array.isArray(sections)) {
    console.error("❌ Unexpected sections shape (not an array). Aborting.");
    process.exit(1);
  }

  let changed = false;
  const summary = [];

  // 1) Fix the team section
  for (const sec of sections) {
    if (sec.type === "team" && Array.isArray(sec.content?.members)) {
      const before = sec.content.members.length;
      const kept = sec.content.members.filter((m) => !shouldDropMember(m));
      const dropped = sec.content.members.filter((m) => shouldDropMember(m));
      if (dropped.length) {
        changed = true;
        summary.push(
          `Team: removed ${dropped.length} member(s): ` +
            dropped.map((m) => `${m.name}${m.title ? ` (${m.title})` : ""}`).join("; ")
        );
        summary.push(`Team: kept ${kept.length}: ${kept.map((m) => m.name).join(", ")}`);
        sec.content.members = kept;
      } else {
        summary.push(`Team: no members matched the drop rules (${before} kept as-is).`);
      }
    }
  }

  // 2) Ensure the partnership section exists (insert after mission, else after team, else append)
  const hasPartnership = sections.some((s) => s.type === "partnership");
  if (!hasPartnership) {
    let idx = sections.findIndex((s) => s.type === "mission");
    if (idx === -1) idx = sections.findIndex((s) => s.type === "team");
    if (idx === -1) idx = sections.length - 1;
    sections.splice(idx + 1, 0, PARTNERSHIP_SECTION);
    changed = true;
    summary.push(`Partnership: inserted narrative section after "${sections[idx].type}".`);
  } else {
    summary.push("Partnership: section already present — left as-is.");
  }

  console.log("\n── Plan ──");
  summary.forEach((l) => console.log("  • " + l));
  console.log("\nResulting section order:");
  console.log("  " + sections.map((s) => s.type).join(" → "));

  if (!changed) {
    console.log("\n✓ Nothing to change.");
    return;
  }

  if (!APPLY) {
    console.log("\n(DRY RUN) Nothing written. Re-run with --apply to commit these changes.");
    return;
  }

  await sql`
    UPDATE about_page_config
    SET sections = ${JSON.stringify(sections)}::jsonb,
        updated_at = NOW(),
        updated_by = 'fix-scleroderma-about script'
    WHERE id = ${id}
  `;
  console.log("\n✅ Applied. Reload the Scleroderma About page to verify.");
})().catch((e) => {
  console.error("❌ Error:", e.message);
  process.exit(1);
});
