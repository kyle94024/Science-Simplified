# Tenant-Specific Customizations

A running log of every place the platform behaves differently for a specific
tenant. **This is a living document — when you add a tenant-specific change,
add a row here in the same commit.**

_Last updated: 2026-05-17_

---

## How multi-tenancy works (3 layers)

Each Vercel deployment serves one tenant, selected by the `NEXT_PUBLIC_SITE_KEY`
env var. Customization happens at three layers:

1. **Config-driven** — `src/lib/sites.js` holds a config object per tenant
   (name, theme colors, logos, copy, feature fields). Most per-tenant
   differences should live here. Read at runtime via `tenant` from
   `src/lib/config.js`.
2. **Code conditionals** — `tenant.shortName === "X"` checks scattered through
   components for behavior that can't be expressed as config. **These are the
   ones to keep an eye on** — they're easy to lose track of. All are listed in
   §1 below.
3. **Per-tenant database** — each tenant has its own Neon DB. The About page in
   particular reads an admin-CMS config (`about_page_config` table) first,
   falling back to `sites.js` defaults (see `src/lib/about-config.js`).

> ⚠️ **shortName vs. object key.** Some `sites.js` keys differ from `shortName`.
> Code conditionals use **`shortName`**. Clinical-trials config uses the
> **uppercase site key**. Mind the gap:
> | sites.js key | shortName | site key (NEXT_PUBLIC_SITE_KEY) |
> |---|---|---|
> | `Ashermans` | `Asherman's` | `ASHERMANS` |
> | `RETT` | `Rett` | `RETTS` |
> | `HUNTINGTONS` | `Huntington's` | `HUNTINGTONS` |
> | `TURNERS` | `TS` | `TURNERS` |
> | `MYOSITIS` | `Myositis` | `MYOSITIS` |

---

## Tenant roster

| shortName | Disease | Domain | Notable customizations |
|---|---|---|---|
| `NF` | Neurofibromatosis | nfsimplified.com | full-width home bg; AI nomenclature addendum; HSF-style ids n/a |
| `HS` | Hidradenitis Suppurativa | hssimplified.org | `hs-mode` theming; HSF deep-link redirects; byline wording; RSS exclusions |
| `EB` | Epidermolysis Bullosa | sseb.vercel.app | config only |
| `CF` | Cystic Fibrosis | sscf-coral.vercel.app | `background-alt` banners |
| `RUNX1` | RUNX1-FPD | www.runx1simplified.org | `runx1-mode` theming; italic "RUNX1-FPD" hero; dark hero bg; login skin; AI nomenclature addendum; partner embed/credit |
| `Scleroderma` | Scleroderma | www.sclerodermasimplified.org | **partner bar + "Science Simplified" wordmark; Clinical Trials hidden; About "Partners" + partnership section; orange CTA; dark hero** |
| `Myositis` | Myositis | www.myositissimplified.org | `myositis-mode` theming; full-width home bg |
| `TS` (Turners) | Turner Syndrome | ssts.vercel.app | supporter logos (TSF) |
| `ALS` | ALS | ssals-ten.vercel.app | hides "Get in Touch" banner text (`invisible`) |
| `Vitiligo` | Vitiligo | ssvitiligo.vercel.app | config only |
| `Aicardi` | Aicardi Syndrome | ssaicardi.vercel.app | config only |
| `Asherman's` | Asherman's Syndrome | ssashermans.vercel.app | config only |
| `Canavan` | Canavan Disease | sscanavan.vercel.app | config only |
| `Rett` | Rett Syndrome | (vercel) | config only |
| `Huntington's` | Huntington's Disease | (vercel) | config only |
| `Progeria` | Progeria | (vercel) | config only |
| `RYR1` | RYR1-related disorders | ssryr1.vercel.app | config only |

---

## 1. Code-level conditional behavior

Every `tenant.shortName`-gated branch in the codebase. Line numbers drift —
treat them as hints.

### Navigation & chrome

| Tenant(s) | What | File |
|---|---|---|
| HS, RUNX1, Scleroderma, Myositis | Navbar gets a tenant "mode" class (`hs-mode` / `runx1-mode` / `scleroderma-mode` / `myositis-mode`) driving themed nav colors | `src/components/Navbar/Navbar.jsx` (~L127); styles in `Navbar.scss` (~L362–600) |
| **Scleroderma** | Slim **partner bar** above the navbar linking to srfcure.org; **"Science Simplified" text wordmark** replaces the image logo; **Clinical Trials nav item hidden** (desktop + mobile) | `src/components/Navbar/Navbar.jsx` (~L96–151); styles in `Navbar.scss` (partner-bar / navbrand--text) |
| **Scleroderma** | Footer uses the **"Science Simplified" wordmark** instead of the image logo | `src/components/Footer/Footer.jsx` (~L9); `Footer.scss` (`&__wordmark`) |

### Home page (`src/app/page.jsx`)

| Tenant(s) | What | Approx line |
|---|---|---|
| RUNX1 | Hero H1 renders italic **"_RUNX1_-FPD"**; all others render `tenant.disease` | ~L102 |
| NF, Scleroderma, Myositis | Full-width hero background (`homeBG_full: true` in config) | ~L53 |
| RUNX1, Scleroderma | Dark hero background variant (`dark-bg` class) | ~L75 |
| Scleroderma | Bright accent color on dark hero (`theme.darkBgAccent`, SRF yellow) | ~L62 |
| HS | Handles `?hsf-id=` deep-link query param → redirects to mapped article | ~L39–44 (`src/lib/hsfRedirects.js`) |

### Banners

| Tenant(s) | What | File |
|---|---|---|
| Most non-NF tenants | `background-alt` styling on the home service banner / subscription banner | `src/components/HomeServiceBanner/HomeServiceBanner.jsx` (~L12); `src/components/SubscriptionBanner/SubscriptionBanner.jsx` (~L15) |
| ALS | Hides "Get in Touch" heading + body text (`invisible`) on both banners | same files (~L14–17) |
| **Scleroderma** | "Explore All" CTA uses `btn-scleroderma-orange` instead of `btn-primary-white` | `HomeServiceBanner.jsx` (~L21); style in `HomeServiceBanner.scss` (~L40) |

### Articles

| Tenant(s) | What | File |
|---|---|---|
| HS | Article search page + list get `hs-mode` styling | `src/app/(public)/articles/page.jsx` (~L27, L111); `src/components/ArticlesListPaginated/ArticlesListPaginated.jsx` (~L27) |
| HS | Article byline label reads **"Summary Prepared or Reviewed By:"** (others: "Summary Prepared By:") | `src/app/(public)/articles/[id]/page.jsx` (~L272) |

### Auth pages

| Tenant(s) | What | File |
|---|---|---|
| RUNX1 | `runx1-login` skin on login / forgot-password / reset-password | `src/app/(public)/login/page.jsx` (~L44), `.../forgot-password/page.jsx` (~L34), `.../reset-password/page.jsx` (~L69); styles in each `*.scss` (~L148) |

### Clinical Trials

| Tenant(s) | What | File |
|---|---|---|
| **Scleroderma** | Feature disabled: `/clinical-trials` redirects home, fetches skipped | `src/app/(public)/clinical-trials/page.jsx` (~L34) |
| HS | RSS feed excludes article IDs that came from HSF redirect mapping | `src/app/rss/route.js` (~L8, L32) |

### AI summarization prompt (`src/utils/apiHelpers.js`)

| Tenant(s) | What | Approx line |
|---|---|---|
| NF | Nomenclature addendum: NF2 → "NF2-related schwannomatosis", schwannomatosis umbrella term | ~L50 |
| RUNX1 | Nomenclature addendum: disease = "RUNX1-FPD"; disambiguate disease vs. gene/protein; normalize old names (FPD/AML, FPDMM…) | ~L62 |

### About page

| Tenant(s) | What | File |
|---|---|---|
| **Scleroderma** | **Team** section = Science Simplified team only (Kyle); the 2 placeholder advisor slots are hidden (`about_teamMember2/3Hidden`). Team subtitle is the normal "Core Team". | `src/lib/sites.js` (Scleroderma block) |
| **Scleroderma** | The SRF relationship is shown via the **"Partnership" narrative section** + top partner bar — **no individual SRF people are listed.** | `src/lib/about-config.js` (~L60); `PartnershipSection.jsx` |
| (none currently) | A generic **"Partners" people section** exists (type `partners`, `about_partnerN*` fields) for tenants that want to list partner-org people. Unused at present — Scleroderma intentionally does not list SRF individuals. | `src/components/about/sections/PartnersSection.jsx`; builder in `src/lib/about-config.js` (~L120) |

> Note: the generic `TeamSection` no longer hardcodes a tenant check — its
> subtitle defaults to "Core Team" and is overridable via `content.subtitle`.

---

## 2. Clinical-trials per-tenant filtering

`src/lib/clinicalTrials/tenantConfig.js` — `TENANT_CONFIG` keyed by **uppercase
site key**. `required` = trial conditions must match ≥1 term; `exclude` = drop
if any term matches; `requireVerification` = only show verified trials (off
everywhere right now).

| Site key | required (match terms) | exclude | requireVerification |
|---|---|---|---|
| HS | hidradenitis suppurativa, hidradenitis | mood, parkinson, glioblastoma | false |
| NF | neurofibromatosis, nf1, nf2, schwannomatosis | — | false |
| EB | epidermolysis bullosa | — | false |
| CF | cystic fibrosis | — | false |
| RUNX1 | runx1, familial platelet disorder | — | false |
| TURNERS | turner syndrome, turners syndrome, monosomy x | — | false |
| HUNTINGTONS | huntington disease, huntington's disease, huntingtons | — | false |
| PROGERIA | progeria, hutchinson-gilford | — | false |
| AICARDI | aicardi syndrome, aicardi-goutieres | — | false |
| ASHERMANS | asherman syndrome, ashermans syndrome, intrauterine adhesion/synechiae | — | false |
| CANAVANS | canavan disease, aspartoacylase deficiency | — | false |
| RETTS | rett syndrome, mecp2 | — | false |
| RYR1 | ryr1, ryanodine receptor, malignant hyperthermia, central core disease | — | false |
| ALS | amyotrophic lateral sclerosis, als, motor neuron disease | mood, depression, caregiver burden | false |
| VITILIGO | vitiligo | — | false |
| SCLERODERMA | scleroderma, systemic sclerosis, morphea | — | false |
| MYOSITIS | myositis, dermatomyositis, polymyositis, inclusion body myositis | — | false |

- **RUNX1 special case**: `trialMatchesTenant()` searches a broader haystack
  (conditions + keywords + title + brief/detailed description) because many
  leukemia trials reference RUNX1 only in the description.
- **Note** (from prior memory): the tenants that started with sparse configs
  (HS, NF, EB, CF) may need their `required`/`exclude` lists expanded over time.

---

## 3. Config-driven customization (`src/lib/sites.js`)

These vary per tenant but are pure config (no code branch needed). When
possible, **prefer adding a config field over a new `shortName` conditional.**

- **`theme`** — color palette + optional `fontFamily` (e.g. Scleroderma uses
  Century Gothic) + `darkBgAccent`. Applied by
  `src/components/ThemeProvider/ThemeProvider.jsx` as CSS variables.
- **`homeBG_full`** — boolean; full-bleed hero background (NF, Scleroderma, Myositis).
- **Logos / banners** — `logoWithText`, `homeBG`, `loginBGTop/Bottom`,
  `articleThumbnailPlaceholder`, etc. (files under `public/assets/<pathName>/`).
  Cloudinary-hosted copies are tracked in `docs/tenant-logos.md`.
- **Copy** — `text_*` and `about_*` fields (mission, team/contributors/
  get-involved/supporters descriptions, team members, supporters).
- **`about_partnership*`** — title/body/CTA for the About partnership section
  (currently only Scleroderma). `about_supporterNHidden` hides a supporter row.
- **`domain`** — used for magic links, RSS, password reset, embed `tenant_url`.

---

## 4. Known brand leaks / tech debt to watch

These hardcode one tenant's branding in shared code — fix opportunistically,
especially before onboarding partners who'll scrutinize their site:

| Issue | File | Impact |
|---|---|---|
| Password-reset email footer hardcodes "© NF Simplified" | `src/lib/email.js` (~L107) | Every tenant's reset email shows "NF Simplified" |
| AI image prompt says "match **NF Simplified's** illustration style" | `src/app/api/articles/generate-ai-image/route.js` (~L38) | Cosmetic; affects generated-image style guidance for all tenants |
| Default founder story mentions **Neurofibromatosis** | `src/lib/about-config.js` (~L115) | Shows on any tenant that hasn't customized the About page via the CMS |
| Commented-out `TENANT_DOMAINS` maps left in magic-link routes | `src/app/api/magic-link/{create,list,verify}/route.js` | Dead code; the live value is `tenant.domain` |

---

## 5. Adding a new tenant-specific change — checklist

1. **Can it be config?** If yes, add a field to the tenant's block in
   `sites.js` and read `tenant.<field>` in the component. Prefer this.
2. If it needs a code branch, gate on `tenant.shortName === "<shortName>"`
   (use the **shortName**, not the object key — see the table at top).
3. If it's a feature toggle that several tenants might share, consider a boolean
   config field (e.g. `tenant.hideClinicalTrials`) instead of stacking
   `shortName` checks.
4. For About-page content, remember the **DB-config-first** behavior: changes to
   `buildDefaultSections` only show for tenants that haven't saved a custom
   About config in the admin CMS. For guaranteed display, the admin must add the
   section via the CMS too.
5. **Add a row to §1 (or §2/§3) of this doc in the same commit.**
