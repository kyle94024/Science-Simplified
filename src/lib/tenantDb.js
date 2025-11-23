import { Pool } from "pg";
import path from "path";

const pools = {};

export function getTenantPool(tenant) {
  if (pools[tenant]) {
    return pools[tenant];
  }

  // // Load tenant-specific env file
  // dotenv.config({
  //   path: path.join(process.cwd(), `.env.${tenant}`),
  //   override: true, // <--- THIS IS WHAT MAKES ENV SWITCH
  // });

  // console.log(`🔄 Loaded env for tenant: ${tenant}`);
  console.log("→ Using DB:", {
    host: process.env.PGHOST,
    user: process.env.PGUSER,
    db: process.env.PGDATABASE,
  });

  const pool = new Pool({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: parseInt(process.env.PGPORT || "5432"),
    ssl: {
      rejectUnauthorized: false,
      require: true,
    },
  });

  pools[tenant] = pool;
  return pool;
}

export async function tenantQuery(tenant, text, params) {
  const pool = getTenantPool(tenant);
  return pool.query(text, params);
}
