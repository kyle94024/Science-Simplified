/**
 * Generic tenant-DB migration runner.
 *
 *   node scripts/migrations/run-migration.js <path-to.sql>   (from main repo root)
 *
 * Applies the given SQL file to every tenant DB (host map in .env.tenants +
 * shared creds in .env, same model as the read-only schema check). Use only with
 * idempotent, additive migrations. Output masks credentials.
 */
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

function findFile(name) {
  return [
    path.join(process.cwd(), name),
    path.join(__dirname, "..", "..", name),
    path.join(__dirname, "..", "..", "..", "..", "..", name),
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

const sqlArg = process.argv[2];
if (!sqlArg) {
  console.error("Usage: node scripts/migrations/run-migration.js <path-to.sql>");
  process.exit(1);
}
const sqlPath = fs.existsSync(sqlArg) ? sqlArg : path.join(__dirname, sqlArg);
const migration = fs.readFileSync(sqlPath, "utf8");

const envMain = parseEnv(findFile(".env"));
const envTenants = parseEnv(findFile(".env.tenants"));
const shared = {
  user: envMain.PGUSER,
  password: envMain.PGPASSWORD,
  database: envMain.PGDATABASE,
  port: parseInt(envMain.PGPORT || "5432", 10),
};

(async function main() {
  const tenants = Object.entries(envTenants).filter(([, h]) => h);
  console.log(`Applying ${path.basename(sqlPath)} to ${tenants.length} tenant DBs…\n`);
  let ok = 0, failed = 0;
  for (const [tenant, host] of tenants) {
    const pool = new Pool({ host, ...shared, ssl: { rejectUnauthorized: false, require: true } });
    try {
      await pool.query(migration);
      console.log(`  ✓ ${tenant}`);
      ok++;
    } catch (err) {
      console.log(`  ✗ ${tenant} — ${err.message}`);
      failed++;
    } finally {
      await pool.end().catch(() => {});
    }
  }
  console.log(`\nDone. ${ok} succeeded, ${failed} failed.`);
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error("Runner error:", e.message);
  process.exit(1);
});
