# Kapi Coast

Full-stack site for the cafe — public pages plus an admin panel where the menu,
journal, cake prices, opening hours, photos and the hero video can all be
changed without touching code.

- **Next.js 15** (App Router, React 19, TypeScript) — frontend and backend in one app
- **Firebase** — Firestore for content, Authentication for the admin login,
  Storage for uploaded photos
- **Docker** — single container, built for [Dokploy](https://dokploy.com)

There is exactly one database: **Firestore**. No Postgres, no Prisma, no
database container. Everything the site stores lives in the same Firebase
project, reached with one service-account credential.

### Nothing Firebase-related reaches the browser

The Firebase *client* SDK is not used anywhere in this project — not for
content, not for login, not for images. Its config (`apiKey`, `projectId`) is
public by design and would ship inside the JavaScript bundle for anyone to read
in DevTools. Everything here goes through the Admin SDK on the server instead,
so there is nothing to find. Verifiable, not a promise:

```bash
npm run build
grep -rl "BEGIN PRIVATE KEY" .next/static | wc -l   # 0
grep -rl "firebase-admin"    .next/static | wc -l   # 0
```

---

## Run it on your laptop

> **Run every command inside this folder.** On the machine this was built on
> that is:
>
> ```
> C:\Users\224509-3rd BBA\OneDrive\Desktop\kapi-coast
> ```
>
> The neighbouring `site` folder is the earlier static-HTML version. It has
> no `package.json`, so `npm run …` there fails with `ENOENT`.

One terminal. `.env` is already set up with working values, and there is no
local database to start — development talks to the same Firestore project as
production.

```bash
cd "C:\Users\224509-3rd BBA\OneDrive\Desktop\kapi-coast"
npm run dev
```

Then open **http://localhost:3000**

First time only, to load the starting content:

```bash
npm run seed
```

That is safe to repeat — it only adds what is missing and never overwrites an
edit made in the admin panel.

### Logging into the admin panel

Go to **http://localhost:3000/admin**

The password lives in Firebase Authentication, not in this repo — this app
never sees or stores it. Create the account either in the Firebase Console
(**Authentication → Users → Add user**) or from a terminal:

```bash
npm run set-admin
```

Whichever you use, the email must match `ADMIN_EMAIL` exactly. That variable is
an allowlist: any *other* account in the Firebase project is refused, so adding
a second user there does not grant access here.

To run the production build locally instead of `npm run dev`:

```bash
npm run build && npm start
```

`npm start` runs the standalone server the same way Docker does — plain
`next start` does **not** work with this config.

With Docker:

```bash
docker compose up --build
```

## Environment variables

| Variable | What it's for |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | Service-account JSON, base64-encoded. **A real secret** — it bypasses every Firebase security rule and works from anywhere |
| `FIREBASE_WEB_API_KEY` | Project identifier used to check passwords against Identity Toolkit. Not a secret, but kept server-side anyway |
| `ADMIN_EMAIL` | The one account allowed to sign in at `/admin` |
| `FIREBASE_STORAGE_BUCKET` | Optional. Unset means uploads fall back to local disk |
| `UPLOAD_DIR` | Where uploads go when Storage is not configured. `/app/uploads` in Docker |
| `SITE_URL` | Public address, used for absolute URLs in `sitemap.xml`, `robots.txt` and `llms.txt` |

There is no `DATABASE_URL`, `ADMIN_PASSWORD` or `SESSION_SECRET`. Firestore
replaced the first; Firebase Authentication holds the password and issues its
own signed session cookies, which removed the other two.

To base64 the service account (the private key inside contains newlines that
environment-variable fields mangle):

```bash
base64 -w0 service-account.json
```

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("service-account.json"))
```

---

## Deploying to Dokploy

Full walkthrough in **[DEPLOY.md](DEPLOY.md)**. In short:

1. Push to GitHub
2. Firebase Console → service-account key, Web API key, enable Email/Password sign-in
3. Dokploy → **Docker Compose** application pointed at this repo
4. Set the environment variables above
5. Mount a volume at `/app/uploads` (only needed if you skip Firebase Storage)
6. Add the domain and turn on HTTPS

No database service to create. On boot the container seeds anything missing and
starts — safe to repeat, so redeploys never duplicate content or overwrite
edits.

---

## Using the admin panel

| Page | What you can change |
|---|---|
| **Menu & recipes** | Dishes, prices, descriptions, ingredients, method, photos, show/hide |
| **Journal** | Posts, with a plain-text editor (`## ` heading, `> ` quote, `- ` bullet) |
| **Cakes & packages** | Flavour prices, size multipliers, add-on charges, event packages |
| **Images & video** | Upload files, copy their link, delete them |
| **Terms & Privacy** | Both legal pages |
| **Site settings** | Name, hero wording, contact, address, opening hours, the owner's note, and every image and video used on the site |

**To swap a photo or the hero video:** upload it under *Images & video*, press
**Copy link**, then paste that link into the matching box in *Site settings* and
save.

---

## Project layout

```
seed/
  seed-data.json      the menu, transcribed from the printed card
  recipes.mjs         method and ingredients for 71 dishes
  journal.mjs         the opening set of posts
  legal-pages.mjs     Terms and Privacy
  seed.mjs            writes all of the above to Firestore (idempotent)
src/
  app/
    page.tsx          home
    menu/             menu + recipe drawer
    journal/          list and article pages
    cakes/            cake builder + packages
    visit/            map, hours, contact
    admin/            login, dashboard, editors
    api/uploads/      streams files from Storage (or disk)
    sitemap.ts        generated from Firestore
    robots.ts
    llms.txt/         a plain-text brief for AI assistants
  components/         shared UI
  lib/
    db.ts             Firestore data layer
    models.ts         document shapes — the source of truth
    firebase.ts       Admin SDK, server-only
    auth.ts           Firebase Auth sign-in and session cookies
    uploads.ts        image re-encoding, Storage or disk
public/               logo, video, photos shipped with the repo
uploads/              runtime uploads when Storage is unused (git-ignored)
```

---

## Notes

### What's real and what still needs filling in

- **The menu is real.** All 76 dishes, prices and descriptions are transcribed
  from the printed menu card, along with the phone number
  (+91 73822 19403) and opening hours (6 am – 10 pm daily).
- **Recipes are written but not the cafe's own.** 71 dishes have method and
  ingredients; they are standard preparations, not a transcription of how this
  kitchen actually cooks. Edit them under *Menu & recipes*.
- **Cake prices are unset.** The card advertises custom cakes but lists no
  rates, so `/cakes` shows a "call us" fallback instead of the price builder.
  Set them under *Cakes & packages*.
- **Dish photos: 1 of 76.** The menu already sorts photographed dishes first.
- **The owner's note is empty**, with a placeholder silhouette. Nothing is
  published under a real person's name unless they wrote it.
- **The email address is blank** — the menu card only gives a phone number, so
  the footer shows just that.

### Security

- Uploads are capped at 25 MB and limited to JPG, PNG, WebP, AVIF, GIF, MP4 and
  WebM. **SVG is deliberately excluded** — it can carry `<script>`, and these
  files are served from our own origin.
- Filenames are UUIDs, so a malicious upload name cannot escape the directory.
- Every admin action re-checks the session server-side. Server actions are
  reachable as POST endpoints, so a page-level check alone would not be enough.
- Sign-in is rate-limited to 8 attempts per 15 minutes per IP.
- Logging out **revokes** the session at Firebase, rather than only deleting the
  cookie — a leaked cookie stops working immediately.
- CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy` and `Permissions-Policy`
  are set on every route.
