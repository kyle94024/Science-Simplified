/**
 * Read-only check: verify every tenant DB has the columns the
 * change-password, reset-password, and change-profile-photo flows depend on.
 *
 *   node scripts/check-auth-schema.js   (run from the main repo root)
 *
 * Connects via the .env.tenants host map + shared creds in .env (same model as
 * the migration runner). Read-only — only queries information_schema.
 */
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

function findFile(name) {
  return [
    path.join(process.cwd(), name),
    path.join(__dirname, "..", name),
    path.join(__dirname, "..", "..", "..", "..", name),
  ].find((f) => fs.existsSync(f));
}
function parseEnv(file) {
  const out = {};
  if (!file || !fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
  }
  return out;
}
const envMain = parseEnv(findFile(".env"));
const envTenants = parseEnv(findFile(".env.tenants"));
const shared = {
  user: envMain.PGUSER,
  password: envMain.PGPASSWORD,
  database: envMain.PGDATABASE,
  port: parseInt(envMain.PGPORT || "5432", 10),
};

// columns each flow needs
const NEEDED = {
  email_credentials: ["email", "password_hash", "reset_token", "reset_token_expiry"],
  profile: ["user_id", "photo", "name", "bio", "degree", "title", "university", "linkedin", "lablink"],
};

(async function main() {
  const tenants = Object.entries(envTenants).filter(([, host]) => host);
  console.log(`Checking ${tenants.length} tenant DBs (read-only)…\n`);
  let allGood = true;

  for (const [tenant, host] of tenants) {
    const pool = new Pool({ host, ...shared, ssl: { rejectUnauthorized: false, require: true } });
    try {
      const res = await pool.query(
        `SELECT table_name, column_name
         FROM information_schema.columns
         WHERE table_name = ANY($1)`,
        [Object.keys(NEEDED)]
      );
      const have = {};
      for (const r of res.rows) {
        (have[r.table_name] = have[r.table_name] || new Set()).add(r.column_name);
      }
      const missing = [];
      for (const [table, cols] of Object.entries(NEEDED)) {
        const present = have[table] || new Set();
        for (const c of cols) if (!present.has(c)) missing.push(`${table}.${c}`);
      }
      if (missing.length === 0) {
        console.log(`  ✓ ${tenant.padEnd(12)} all columns present`);
      } else {
        allGood = false;
        console.log(`  ✗ ${tenant.padEnd(12)} MISSING: ${missing.join(", ")}`);
      }
    } catch (err) {
      allGood = false;
      console.log(`  ! ${tenant.padEnd(12)} error: ${err.message}`);
    } finally {
      await pool.end().catch(() => {});
    }
  }
  console.log(allGood ? "\n✅ All tenants have the required columns." : "\n⚠ Some tenants are missing columns (see above).");
  process.exit(allGood ? 0 : 1);
})().catch((e) => {
  console.error("Runner error:", e.message);
  process.exit(1);
});
