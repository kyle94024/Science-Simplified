/**
 * Apply 2026-clinical-trials-workflow.sql to every tenant database.
 *
 * The editorial-workflow code (PR #31) reads/writes workflow_status +
 * published_at on clinical_trials. These columns don't exist yet, so this must
 * run on ALL tenant DBs before the merged code is exercised in production.
 *
 * RUN FROM THE MAIN REPO ROOT (where .env.tenants lives):
 *   node ".claude/worktrees/recursing-easley/scripts/migrations/run-clinical-trials-workflow.js"
 *
 * The migration is idempotent (ADD COLUMN IF NOT EXISTS + re-runnable UPDATEs),
 * so running it more than once is safe.
 *
 * It discovers tenant connection strings from .env.tenants / .env: every value
 * that looks like a postgres URL is treated as one tenant DB (deduped). Your
 * credentials never leave your machine — run this locally.
 *
 * If your tenant connections aren't stored as postgres URLs, pass them yourself:
 *   TENANT_DB_URLS="postgres://...,postgres://..." node .../run-clinical-trials-workflow.js
 */
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

// ── Load env files from likely locations ─────────────────────────────────────
function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    const val = m[2].trim().replace(/^['"]|['"]$/g, "");
    if (!(key in process.env)) process.env[key] = val;
  }
}
const here = __dirname;
[
  path.join(process.cwd(), ".env.tenants"),
  path.join(process.cwd(), ".env"),
  path.join(here, "..", "..", ".env.tenants"),
  path.join(here, "..", "..", "..", "..", "..", ".env.tenants"), // main repo from worktree
  path.join(here, "..", "..", "..", "..", "..", ".env"),
].forEach(loadEnvFile);

// ── Collect tenant connection strings ────────────────────────────────────────
function collectConnStrings() {
  const out = new Set();
  if (process.env.TENANT_DB_URLS) {
    process.env.TENANT_DB_URLS.split(",").map((s) => s.trim()).filter(Boolean).forEach((u) => out.add(u));
  }
  const isPg = (v) => typeof v === "string" && /^postgres(ql)?:\/\//.test(v);
  for (const v of Object.values(process.env)) {
    if (isPg(v)) out.add(v);
  }
  return [...out];
}

// Mask a connection string for logging (never print credentials)
function label(conn) {
  try {
    const u = new URL(conn);
    return `${u.host}${u.pathname}`;
  } catch {
    return "(unparseable connection)";
  }
}

(async function main() {
  const sqlPath = path.join(here, "2026-clinical-trials-workflow.sql");
  const migration = fs.readFileSync(sqlPath, "utf8");

  const conns = collectConnStrings();
  if (conns.length === 0) {
    console.error(
      "❌ No tenant DB connection strings found.\n" +
        "   Run from the main repo root (where .env.tenants lives), or pass them:\n" +
        '   TENANT_DB_URLS="postgres://...,postgres://..." node .../run-clinical-trials-workflow.js'
    );
    process.exit(1);
  }

  console.log(`Found ${conns.length} tenant database(s). Applying migration…\n`);
  let ok = 0;
  let failed = 0;
  for (const conn of conns) {
    const pool = new Pool({
      connectionString: conn,
      ssl: { rejectUnauthorized: false, require: true },
    });
    try {
      await pool.query(migration);
      console.log(`  ✓ ${label(conn)}`);
      ok++;
    } catch (err) {
      console.log(`  ✗ ${label(conn)} — ${err.message}`);
      failed++;
    } finally {
      await pool.end().catch(() => {});
    }
  }
  console.log(`\nDone. ${ok} succeeded, ${failed} failed.`);
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error("❌ Runner error:", e.message);
  process.exit(1);
});
