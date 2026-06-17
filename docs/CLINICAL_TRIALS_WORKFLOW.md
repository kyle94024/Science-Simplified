# Clinical Trials — Editorial Workflow

How a clinical trial moves from synced data to a public, editor-verified summary.
This blends our overhaul (verification, assignments, semantic search, translation,
lifecycle) with Timi's editorial-workflow layer (PR #31).

## State machine — `clinical_trials.workflow_status`

```
unassigned ──assign──▶ editing ──submit──▶ review_submitted ──verify──▶ published
                          ▲                       │                        │
                          └──────── edit ─────────┘                        │
                          ▲────────────── remove verification ─────────────┘
```

| status | meaning | set by |
|---|---|---|
| `unassigned` | synced, no researcher assigned / no action | default; sync |
| `editing` | assigned & in progress (or edited) | assignment (`POST /api/admin/trial-assignments`), and any save (`PATCH /api/admin/clinical-trials/[nctId]`) |
| `review_submitted` | researcher submitted for admin review | `POST /api/researcher/assigned-trials/[nctId]/submit` |
| `published` | admin verified → live in Verified section | `POST /api/clinical-trials/[nctId]/verify` (also sets `verified_by`, `verified_at`, `published_at`) |

Removing verification (`DELETE …/verify`) reverts `published → editing` and clears
`verified_by` / `published_at`.

> `verified_by` (JSONB snapshot of the reviewer) and `workflow_status='published'`
> are kept in sync by the verify route. Public listing splits Verified vs. other
> by `verified_by`; the workflow_status drives the **admin/researcher** views.

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

`workflow_status TEXT DEFAULT 'unassigned'` and `published_at TIMESTAMPTZ` were added
by `scripts/migrations/2026-clinical-trials-workflow.sql`. **Run it on all tenant DBs**
(`scripts/migrations/run-clinical-trials-workflow.js`) — the workflow routes assume
these columns exist. Migration is idempotent.
