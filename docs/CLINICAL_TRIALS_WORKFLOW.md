# Clinical Trials — Editorial Workflow

How a clinical trial moves from synced data to a public, editor-verified summary.
This blends our overhaul (verification, assignments, semantic search, translation,
lifecycle) with Timi's editorial-workflow layer (PR #31).

## State machine — `workflow_status` is DERIVED, not stored

To keep the core `clinical_trials` schema untouched, `workflow_status` is **not a
column**. It's computed from data that already exists plus one tiny table:

```
unassigned ──assign──▶ editing ──submit──▶ review_submitted ──verify──▶ published
                          ▲                       │                        │
                          └──────── edit ─────────┘                        │
                          ▲────────────── remove verification ─────────────┘
```

| status | derived when… | source of truth |
|---|---|---|
| `published` | `clinical_trials.verified_by IS NOT NULL` | the verification (publish date = `verified_at`) |
| `review_submitted` | a row exists in `trial_review_submissions` (and not verified) | `POST /api/researcher/assigned-trials/[nctId]/submit` inserts; verify/edit delete it |
| `editing` | the trial has a row in `trial_assignments` (and not the above) | assignment membership |
| `unassigned` | none of the above | — |

State transitions are driven by **side effects**, not a status column:
- **assign** → row in `trial_assignments` (derives `editing`)
- **submit** → row in `trial_review_submissions` (derives `review_submitted`)
- **edit** (`PATCH …/[nctId]`) → deletes the submission row (back to `editing`)
- **verify** (`POST …/verify`) → sets `verified_by` + deletes the submission row (`published`)
- **remove verification** (`DELETE …/verify`) → clears `verified_by` (back to `editing`/`unassigned`)

The status CASE lives in the admin list (`/api/admin/clinical-trials`) and the
researcher dashboard (`/api/researcher/assigned-trials`) queries; APIs return a
`workflow_status` string so the UI is unchanged. `published_at` is returned as an
alias of `verified_at`.

> Why derived: `verified_by` stays the **single source of truth** for "published",
> so a status column can never drift out of sync with the verification. The only
> genuinely-new state (`review_submitted`) lives in its own table.

## End-to-end flow

1. **Admin assigns** a trial to a researcher (`/admin/researchers`). Trial → `editing`; a magic link is emailed.
2. **Researcher** clicks the link → `/researcher/dashboard` → opens the trial (`/researcher/trials/[nctId]`, `TrialEditor mode="researcher"`).
3. **Researcher edits & saves** (PATCH, allowed for assigned researchers via `requireAdminOrAssignedResearcher`). Stays `editing`.
4. **Researcher clicks "Submit for Review"** → `review_submitted`.
5. **Admin** sees it surfaced in `/admin/clinical-trials` — sorted to top, blue "Submitted for review" badge, "Submitted for Review" stat + filter pill.
6. **Admin verifies** (picks a reviewer profile) → `published`, `verified_by` snapshot stored.
7. **Public** trial page + cards show **"Editor Verified"** (reviewer name is NOT exposed publicly; it's retained internally for auditing).

## Public-facing reviewer attribution

Public pages show **"Verified by {Name}, {Degree}"** (and affiliation when set) —
the reviewer's name and credentials are a deliberate trust signal.

When an admin verifies a trial they pick a researcher profile to pre-fill the
details, then **can edit the displayed name / degree / affiliation** before
confirming. They can also edit those fields later via "Edit name / degree" on an
already-verified trial — this merges into the existing `verified_by` snapshot and
preserves the original verification date. (`POST …/verify` accepts
`{ profileId?, name?, degree?, university?, title? }`; sending only the override
fields edits an existing verification.)

> Note: this reverses PR #31's "Editor Verified" (name-hidden) treatment, per
> product decision to keep named attribution. If a tenant ever wants the name
> hidden, gate the label on a tenant flag rather than hard-coding it.

## Schema

**The `clinical_trials` table is unchanged.** The only schema addition is one small
table:

```sql
CREATE TABLE IF NOT EXISTS trial_review_submissions (
  nct_id        TEXT PRIMARY KEY,
  submitted_at  TIMESTAMPTZ DEFAULT NOW(),
  submitted_by  INTEGER
);
```

Created by `scripts/migrations/2026-clinical-trials-workflow.sql`. **Run it on all
tenant DBs** via `scripts/migrations/run-clinical-trials-workflow.js`. Idempotent.
No columns are added to `clinical_trials`; everything else is derived (see the
state-machine section above).
