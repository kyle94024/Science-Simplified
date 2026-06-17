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

## Public-facing privacy

Per PR #31: public pages show "Editor Verified" / "This summary has been reviewed
and editor verified." — never the reviewer's name. The reviewer identity lives in
`verified_by` for internal/admin use only.

## Schema

`workflow_status TEXT DEFAULT 'unassigned'` and `published_at TIMESTAMPTZ` were added
by `scripts/migrations/2026-clinical-trials-workflow.sql`. **Run it on all tenant DBs**
(`scripts/migrations/run-clinical-trials-workflow.js`) — the workflow routes assume
these columns exist. Migration is idempotent.
