import { getTenantPool } from "./tenantDb.js";

// Store token
export async function storeMagicLink({
  tenant,
  email,
  tokenHash,
  redirectUrl,
}) {
  const pool = getTenantPool(tenant);

  await pool.query(
    `INSERT INTO magic_links (email, token_hash, redirect_url)
     VALUES ($1, $2, $3)`,
    [email, tokenHash, redirectUrl]
  );
}

// Fetch + validate token
export async function getMagicLinkRecord(tenant, tokenHash) {
    const pool = getTenantPool(tenant);

    const result = await pool.query(
        `SELECT * FROM magic_links 
         WHERE token_hash = $1 AND used = FALSE`,
        [tokenHash]
    );

    return result.rows[0] || null;
}

// Mark as used
export async function markTokenUsed(tenant, tokenHash) {
    const pool = getTenantPool(tenant);

    await pool.query(
        `UPDATE magic_links SET used = TRUE WHERE token_hash = $1`,
        [tokenHash]
    );
}
