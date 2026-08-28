# Handover audit — Kapi Coast

Technical audit run against the repository and the live deployment before
handover. Everything below was tested, not assumed; the method is named for
each item so it can be re-run.

**This is not legal advice.** Items 8–10 are business decisions for the owner,
and the contract, acceptance form and legal policies should be reviewed by a
qualified adviser. Nothing here claims the site is "compliant" or "bug free".

Audited 2026-08-28 · Deployment `kapi-coast-site-vfsee3-a7be1b-72-62-194-136.sslip.io`

---

## Passed

| Check | Method | Result |
|---|---|---|
| Secrets in git history | pattern scan across all commits for private keys, `sk-or-v1-`, service accounts | clean — only DEPLOY.md/README.md showing an example command |
| Secrets in client bundle | `grep -rl` over `.next/static` for key material | 0 files, including the Firebase Web API key |
| `.env` committed | `git log --all -- .env` | never committed; `.gitignore:13` covers `.env*` |
| Admin gating | 6 admin routes requested unauthenticated | all redirect to `/admin/login`, no dashboard markup served |
| Firestore writes | unauthenticated PATCH to a probe document | `403 PERMISSION_DENIED` |
| Security headers | response headers on `/` | CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy, Permissions-Policy all present |
| HTTPS | TLS verification on every request | valid |
| Pages | 7 routes | all `200` |
| Links | every `a[href]` on every page | 19/19 internal, 3/3 external, phone number consistent throughout |
| Responsive | 1440 / 768 / 390 | no horizontal scroll at any width |
| Touch targets | every interactive element at 390px with touch emulation | none under 44px |
| Dish images | all 76 live URLs fetched individually | all serve |
| Trackers | source scan for GA, GTM, Meta, Hotjar, Clarity, PostHog, Mixpanel | none |
| Cookies | source scan | only the admin session cookie; `Secure` derived from `x-forwarded-proto` |
| Personal data | cake builder traced end to end | **stores nothing** — it composes a WhatsApp message client-side, so order details go customer → WhatsApp → cafe and never touch the site or its database |
| Fonts | source scan | Rozha One, Anton, Karla, Anek Tamil — all Google Fonts under the Open Font Licence, free for commercial use |

---

## Findings

### 1. Storage bucket was public — FIXED 2026-08-28

Anyone could list every uploaded file and fetch any of them without
credentials. Both of these returned `200`:

    GET  /v0/b/<bucket>/o
    GET  /v0/b/<bucket>/o/uploads%2F<file>?alt=media

This contradicted the code. `src/lib/uploads.ts` states the object "is never
made public: it is read back through our own route, so there is no URL to
guess and nothing to expire". The app did serve images through
`/api/uploads/<name>` as designed, but the bucket never enforced it — the
private route was a convention, not a boundary.

**Fixed.** `storage.rules` now denies all client access and is deployed. Both
requests above return `403`. The server reads through the Admin service
account, which bypasses rules, so `/api/uploads/<name>` still serves normally.

### 2. Firestore was world-readable — FIXED 2026-08-28

Every collection answered an unauthenticated request with `200`: `menuItems`,
`settings`, `media`, `posts`, `categories`. Writes were already denied.

Impact was low — what was readable is content the site publishes, and the 9
documents lacking `published: true` turned out to be category headers rather
than drafts. But every query in `src/lib/db.ts` filters `published: true`,
which means drafts are meant to be private, and the raw API ignored that.

**Fixed.** `firestore.rules` denies all client access and is deployed; all
collections now return `403`. Verified afterwards that the site is unaffected:
76 dish cards, 152 image references and 24 corridor labels still render, and
every page still returns `200`.

### 3. Dependency advisories — CORRECTED, LOW

**An earlier version of this audit said sharp was the advisory that mattered,
because sharp parses uploaded images. That was wrong, and the correction is
worth stating plainly.**

`npm audit --omit=dev` reports 6 moderate and 4 high. Resolving where each
actually lives:

| Package | Version in tree | Vulnerable range | Reachable here? |
|---|---|---|---|
| `sharp` (app's own) | 0.35.4 | `<0.35.0` | **No — outside the range** |
| `sharp` (inside Next) | 0.34.5 | `<0.35.0` | No — only `next/image` uses it |
| `postcss` (inside Next) | 8.4.31 | `<=8.5.22` | Build-time CSS tooling only |
| `nanoid` (inside Next) | 3.3.16 | `<3.3.18` | Build-time, via postcss |
| `next` | 15.5.22 | `9.3.4 – 16.3.0-preview.10` | Fixed only by 15 → 16, a major |

The sharp that `src/lib/uploads.ts` imports resolves to `node_modules/sharp` at
**0.35.4**, above the vulnerable range. It was already outside it before this
audit. The vulnerable copy is Next's own bundled `0.34.5`, which serves the
`next/image` optimizer — and this app imports `next/image` **zero times**
(every image is a plain `<img>`), with `/_next/image` returning `404` in
production. The vulnerable code path is not reachable.

So all four high advisories sit inside Next's dependency tree and are cleared
only by the Next 15 → 16 major, which does not belong in a handover. None of
them is exploitable in this app's configuration.

`sharp` was updated 0.35.3 → 0.35.4 and `firebase-admin` 14.2.0 → 14.3.0
anyway — both inside their existing carets, both verified with a clean
production build and an image round-trip through the upload pipeline.

### 4. `SITE_URL` is `http://` — MEDIUM (SEO)

`robots.txt` and every `<loc>` in `sitemap.xml` emit `http://` while the site
serves over HTTPS. Search engines treat the two as different sites, so this
submits a sitemap of URLs that all redirect. It fails silently.

Set `SITE_URL` in Dokploy to the `https://` address now, and to
`https://kapicoast.in` at cutover.

### 5. Firebase rules were not in the repository — FIXED 2026-08-28

There was no `firestore.rules`, `storage.rules` or `firebase.json`; the rules
governing findings 1 and 2 existed only in the Firebase console — not
reviewable in a pull request, not restorable from git, and not part of what the
client receives.

**Fixed.** `firestore.rules`, `storage.rules`, `firebase.json` and
`.firebaserc` are committed, so the security boundary is now a reviewable
artefact that ships with the code.

Note for whoever redeploys them: the Firebase CLI could not deploy these. The
account it is logged in as cannot see project `website-9b05e`, and the service
account lacks `serviceusage.serviceUsageConsumer`, which the CLI needs for its
API-enablement preflight. They were released through the Firebase Rules REST
API directly, which skips that preflight. Granting the deploying account
proper access is the tidy long-term fix.

### 6. Repository ownership — CONFIRM

`kapicoast-byte/site` is owned by `kapicoast-byte`; the authenticated account
`Jayanthpasala` has push but **not admin**. Worth confirming which of these the
client actually controls, since handover of ownership turns on it. The
repository is **public** — fine if intended, but it should be a deliberate
decision.

### 7. `kapicoast.in` is still parked — BLOCKS LAUNCH

Nameservers `ns13`/`ns14.domaincontrol.com`, A records `3.33.130.190` and
`15.197.148.33`, serving a 114-byte GoDaddy parking redirect. The site is only
reachable at the sslip.io address. Point DNS at `72.62.194.136`, enable Let's
Encrypt in Dokploy, then update `SITE_URL`.

### 8. All 76 dish photographs are AI-generated — CLIENT SIGN-OFF

None is a photograph of food plated at Kapi Coast. The full record is in
[IMAGE-PROVENANCE.md](IMAGE-PROVENANCE.md): model, date, cost and the exact
prompt behind every image, plus the ten trademarked items (Coke, KitKat,
Horlicks and the rest) that were deliberately described generically so no brand
livery was ever generated.

This is the largest content-liability item on the site and needs explicit
written sign-off, not "looks good". Portion, garnish, crockery and colour will
differ from what the kitchen serves. The owner should either approve each image
knowing that, or replace them with real photographs.

### 9. Recipes and ingredients — CLIENT SIGN-OFF

Every dish carries a recipe with ingredients. The owner should verify these,
particularly anything a customer with an allergy might rely on. The developer
should not be warranting ingredient accuracy.

### 10. Legal pages — NEEDS QUALIFIED REVIEW

`/terms` and `/privacy` are live and reachable. Whether they are adequate for
this business — and how the DPDP framework applies given the site stores no
personal data at all, per the cake-builder result above — is a question for a
qualified adviser, not for the developer and not for this audit.

---

## Re-running this

    npm audit --omit=dev                 # dependency state
    npm run build                        # production build
    node scripts/gen-dish-images.mjs     # dry run: image prompts and cost

The link crawl, responsive checks and tap-target checks were run with Playwright
against the live deployment.
