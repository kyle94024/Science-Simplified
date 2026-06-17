-- ============================================================================
-- Clinical Trials editorial workflow (PR #31 blend)
-- ----------------------------------------------------------------------------
-- Adds the workflow_status + published_at columns the editorial-workflow code
-- (verify / submit-for-review / admin PATCH routes) reads and writes. Our
-- earlier clinical-trials overhaul did NOT add these, so they must be created
-- on every tenant DB or those routes will throw.
--
-- workflow_status values: 'unassigned' | 'editing' | 'review_submitted' | 'published'
--
-- Idempotent: safe to run repeatedly on any tenant DB.
-- ============================================================================

ALTER TABLE clinical_trials
  ADD COLUMN IF NOT EXISTS workflow_status TEXT DEFAULT 'unassigned',
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- Backfill: a trial that already has a verifier is effectively published.
UPDATE clinical_trials
  SET workflow_status = 'published',
      published_at = COALESCE(published_at, verified_at, NOW())
  WHERE verified_by IS NOT NULL
    AND (workflow_status IS NULL OR workflow_status <> 'published');

-- Backfill: trials currently assigned to a researcher (and not yet published)
-- are in the editorial pipeline → mark them 'editing' so admins can see them.
UPDATE clinical_trials ct
  SET workflow_status = 'editing'
  WHERE ct.verified_by IS NULL
    AND (ct.workflow_status IS NULL OR ct.workflow_status = 'unassigned')
    AND EXISTS (
      SELECT 1 FROM trial_assignments ta WHERE ta.nct_id = ct.nct_id
    );

-- Anything still NULL gets the default.
UPDATE clinical_trials
  SET workflow_status = 'unassigned'
  WHERE workflow_status IS NULL;

-- Helpful index for admin "awaiting review" / status filtering.
CREATE INDEX IF NOT EXISTS idx_clinical_trials_workflow_status
  ON clinical_trials (workflow_status);
