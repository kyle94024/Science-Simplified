/**
 * Apply 2026-clinical-trials-workflow.sql to every tenant database.
 *
 * The editorial workflow needs ONE small new table (trial_review_submissions);
 * the clinical_trials schema is left untouched (workflow status is derived in
 * code). Run on ALL tenant DBs before the merged code is exercised in prod.
 *
 * RUN FROM THE MAIN REPO ROOT (where .env.tenants lives):
 *   node ".claude/worktrees/recursing-easley/scripts/migrations/run-clinical-trials-workflow.js"
 *
 * Idempotent (CREATE TABLE IF NOT EXISTS) — safe to run repeatedly.
 *
 * Connection model (in priority order):
 *   1. TENANT_DB_URLS="postgres://...,postgres://..."  — full URLs, used as-is.
 *   2. .env.tenants as a TENANT=<host> map, combined with shared credentials
 *      from .env (PGUSER / PGPASSWORD / PGDATABASE / PGPORT). Per-tenant
 *      overrides PG{USER,PASSWORD,DATABASE,HOST}_<TENANT> win when present.
 * Connecting is keyed by host, so it always targets the right tenant DB; a
 * wrong db-name/password simply fails that one connection (harmless).
 */
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

// ── Locate + read env files ──────────────────────────────────────────────────
function findFile(name) {
  const candidates = [
    path.join(process.cwd(), name),
    path.join(__dirname, "..", "..", name),
    path.join(__dirname, "..", "..", "..", "..", "..", name), // main repo from worktree
  ];
  return candidates.find((f) => fs.existsSync(f)) || null;
}
function parseEnv(file) {
  const out = {};
  if (!file || !fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    out[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
  }
  return out;
}

const envMain = parseEnv(findFile(".env"));
const envTenants = parseEnv(findFile(".env.tenants"));

const shared = {
  user: process.env.PGUSER || envMain.PGUSER,
  password: process.env.PGPASSWORD || envMain.PGPASSWORD,
  database: process.env.PGDATABASE || envMain.PGDATABASE,
  port: parseInt(process.env.PGPORT || envMain.PGPORT || "5432", 10),
};

// ── Build the list of { tenant, config } targets ─────────────────────────────
function buildTargets() {
  const targets = [];

  // 1. Explicit full URLs win.
  if (process.env.TENANT_DB_URLS) {
    process.env.TENANT_DB_URLS.split(",").map((s) => s.trim()).filter(Boolean).forEach((url, i) => {
      targets.push({ tenant: `url-${i + 1}`, config: { connectionString: url, ssl: { rejectUnauthorized: false } } });
    });
    return targets;
  }

  // 2. .env.tenants host map + shared creds (with optional per-tenant overrides).
  for (const [tenant, host] of Object.entries(envTenants)) {
    if (!host) continue;
    const up = tenant.toUpperCase();
    // If the value already looks like a full URL, use it directly.
    if (/^postgres(ql)?:\/\//.test(host)) {
      targets.push({ tenant, config: { connectionString: host, ssl: { rejectUnauthorized: false } } });
      continue;
    }
    targets.push({
      tenant,
      config: {
        host,
        user: envMain[`PGUSER_${up}`] || shared.user,
        password: envMain[`PGPASSWORD_${up}`] || shared.password,
        database: envMain[`PGDATABASE_${up}`] || shared.database,
        port: parseInt(envMain[`PGPORT_${up}`] || "", 10) || shared.port,
        ssl: { rejectUnauthorized: false, require: true },
      },
    });
  }
  return targets;
}

(async function main() {
  const sqlPath = path.join(__dirname, "2026-clinical-trials-workflow.sql");
  const migration = fs.readFileSync(sqlPath, "utf8");

  const targets = buildTargets();
  if (targets.length === 0) {
    console.error(
      "❌ No tenant targets found.\n" +
        "   Run from the main repo root (where .env / .env.tenants live), or pass:\n" +
        '   TENANT_DB_URLS="postgres://...,postgres://..." node .../run-clinical-trials-workflow.js'
    );
    process.exit(1);
  }

  if (!shared.user || !shared.password || !shared.database) {
    console.warn(
      "⚠ No TENANT_DB_URLS and shared PGUSER/PGPASSWORD/PGDATABASE not all set — " +
        "host-map connections may fail. (Found: user=" + !!shared.user + ", password=" +
        !!shared.password + ", database=" + !!shared.database + ")"
    );
  }

  console.log(`Applying migration to ${targets.length} target(s)…\n`);
  let ok = 0, failed = 0;
  const failures = [];
  for (const { tenant, config } of targets) {
    const pool = new Pool(config);
    const host = config.host || (() => { try { return new URL(config.connectionString).host; } catch { return "?"; } })();
    try {
      await pool.query(migration);
      console.log(`  ✓ ${tenant.padEnd(12)} ${host}`);
      ok++;
    } catch (err) {
      console.log(`  ✗ ${tenant.padEnd(12)} ${host} — ${err.message}`);
      failed++;
      failures.push(tenant);
    } finally {
      await pool.end().catch(() => {});
    }
  }
  console.log(`\nDone. ${ok} succeeded, ${failed} failed.`);
  if (failed) {
    console.log(`Failed tenants: ${failures.join(", ")}`);
    console.log(
      "If these failed on auth/db-name, their credentials differ from the shared .env set.\n" +
        "Provide them via PG{USER,PASSWORD,DATABASE}_<TENANT> in .env, or TENANT_DB_URLS."
    );
  }
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error("❌ Runner error:", e.message);
  process.exit(1);
});
