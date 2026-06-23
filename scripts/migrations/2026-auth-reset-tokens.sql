-- ============================================================================
-- Password-reset tokens — add the columns the forgot/reset-password flow needs.
-- ----------------------------------------------------------------------------
-- /api/auth/request-reset writes reset_token + reset_token_expiry, and
-- /api/auth/reset-password (+ update-password) reads them. These columns existed
-- only on NF (and staging), so the reset flow failed on every other tenant.
--
-- Idempotent + additive (nullable columns, no data change). Safe to re-run.
-- ============================================================================

ALTER TABLE email_credentials
  ADD COLUMN IF NOT EXISTS reset_token        TEXT,
  ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMPTZ;
