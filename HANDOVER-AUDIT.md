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

### 1. Storage bucket is public — HIGH

Anyone can list every uploaded file and fetch any of them directly. Both of
these return `200` with no credentials:

    GET  /v0/b/<bucket>/o
    GET  /v0/b/<bucket>/o/uploads%2F<file>?alt=media

This contradicts what the code believes. `src/lib/uploads.ts` states the object
"is never made public: it is read back through our own route, so there is no
URL to guess and nothing to expire". The application does serve images through
`/api/uploads/<name>` as designed, but the bucket does not enforce it — the
private route is a convention, not a boundary.

Today the bucket holds only dish photography that is already published, so
nothing confidential is exposed. It matters the moment something non-public is
uploaded through the admin media manager, which is what that panel is for.

Fix in the Firebase console. The server uses the service account and bypasses
rules, so the site is unaffected:

    rules_version = '2';
    service firebase.storage {
      match /b/{bucket}/o {
        match /{allPaths=**} { allow read, write: if false; }
      }
    }

### 2. Firestore is world-readable — MEDIUM

Every collection returns `200` unauthenticated: `menuItems`, `settings`,
`media`, `posts`, `categories`. Writes are correctly denied.

Impact today is low — what is readable is the same content the website
publishes, and the 9 documents lacking `published: true` turned out to be
category headers rather than drafts. But every application query filters
`published: true`, which means drafts are intended to be private, and the raw
API ignores that filter. The first unpublished post or unannounced price change
will be readable by anyone who knows the project ID.

Fix the same way: deny client reads, let the service account do the work.

### 3. Ten dependency vulnerabilities, four high — MEDIUM

`npm audit --omit=dev` reports 6 moderate and 4 high, all marked fixable.

The one that matters is **sharp**, which inherits four libvips CVEs
(CVE-2026-33327, -33328, -35590, -35591). sharp processes every image uploaded
through the admin panel, so it parses untrusted input. Current `^0.35.3`,
patched in `0.35.4` — inside the existing caret, so it is a lockfile update
with no code change. `firebase-admin` `^14.2.0` → `14.3.0` is likewise in range.

`next` would need 15 → 16, a major migration, and should not be bundled into a
handover.

Suggested: `npm update sharp firebase-admin`, rebuild, redeploy. **Not run** —
it changes production dependencies on a live site, which is the owner's call.

### 4. `SITE_URL` is `http://` — MEDIUM (SEO)

`robots.txt` and every `<loc>` in `sitemap.xml` emit `http://` while the site
serves over HTTPS. Search engines treat the two as different sites, so this
submits a sitemap of URLs that all redirect. It fails silently.

Set `SITE_URL` in Dokploy to the `https://` address now, and to
`https://kapicoast.in` at cutover.

### 5. Firebase rules are not in the repository — MEDIUM

There is no `firestore.rules`, `storage.rules` or `firebase.json`. The rules
governing findings 1 and 2 exist only in the Firebase console — not reviewable
in a pull request, not restorable from git, and not part of what the client
receives. Committing them makes the security boundary a reviewable artefact.

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
