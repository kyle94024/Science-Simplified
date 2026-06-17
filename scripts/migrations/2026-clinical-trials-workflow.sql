-- ============================================================================
-- Clinical Trials editorial workflow — minimal-footprint version
-- ----------------------------------------------------------------------------
-- We deliberately DO NOT add workflow_status / published_at columns to the
-- clinical_trials table. The editorial state is derived from data that already
-- exists, plus one tiny new table for the only genuinely-new piece of state:
--
--   published        ⟺ clinical_trials.verified_by IS NOT NULL  (published_at = verified_at)
--   review_submitted ⟺ a row exists in trial_review_submissions
--   editing          ⟺ the trial is assigned (row in trial_assignments) and not the above
--   unassigned       ⟺ none of the above
--
-- This keeps verified_by as the single source of truth for "published" (no
-- column to drift out of sync) and leaves the core schema untouched.
--
-- Idempotent: safe to run repeatedly on any tenant DB.
-- ============================================================================

CREATE TABLE IF NOT EXISTS trial_review_submissions (
  nct_id        TEXT PRIMARY KEY,
  submitted_at  TIMESTAMPTZ DEFAULT NOW(),
  submitted_by  INTEGER
);
