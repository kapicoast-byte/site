# Going live

Everything here is done once. Work top to bottom.

---

## 1. Push to GitHub

```bash
cd kapi-coast
git add -A
git commit -m "Kapi Coast site"
git branch -M main
git remote add origin https://github.com/<you>/kapi-coast.git
git push -u origin main
```

`.gitignore` already keeps `.env`, `/uploads/*` and `.pgdata/` out, so no secrets
or local test data go up. Check the push with `git status` — it should say
nothing to commit.

---

## 2. Firebase — the service account, and the admin login

Login is Firebase Authentication now. There is no password or session secret
in this app's own configuration anymore; both live in Firebase, and this app
only ever asks Firebase to check them.

**a) Get a service account key.** Firebase Console → Project settings →
Service accounts → Generate new private key. That downloads a JSON file. It is
a real secret: it bypasses every Firebase security rule and works from
anywhere. Never commit it — `.gitignore` already refuses the usual filenames.

Base64 it, because the private key inside contains newlines that environment
variable fields mangle:

```bash
base64 -w0 service-account.json
```

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("service-account.json"))
```

That becomes `FIREBASE_SERVICE_ACCOUNT`.

**b) Get the Web API key.** Firebase Console → Project settings → General →
Web API Key. This one is a project identifier, not a secret — the same value a
client app would ship publicly — but it stays server-side here regardless,
consistent with everything else Firebase-related on this site. That becomes
`FIREBASE_WEB_API_KEY`.

**c) Turn on Email/Password sign-in.** Firebase Console → Authentication →
Sign-in method → enable **Email/Password**. Off by default on a new project;
login fails with every password correct until this is on.

**d) Create the admin account.** With `FIREBASE_SERVICE_ACCOUNT` and
`ADMIN_EMAIL` set in `.env` (or exported in your shell):

```bash
node scripts/set-admin-user.mjs
```

Type the password when asked. It goes straight to Firebase over TLS and is
never written to a file or your shell history. Keep it in a password manager —
there is no reset link, and no second account to let you back in. Run the same
command again any time to change it.

---

## 3. Firebase Storage (for uploaded photos) — optional

Stops a lost disk volume taking every photo with it. Uses the same service
account from step 2 — nothing new to generate, and no separate database service
to create either: Firestore is already provisioned in the same project.

Add one more variable in Dokploy: `FIREBASE_STORAGE_BUCKET`, e.g.
`your-project.firebasestorage.app`.

**Leave the bucket private.** Do not add public read rules. Files are proxied
through `/api/uploads/<name>`, so nothing needs direct access and no Google URL
ever appears in the page.

With it set, uploads go to the bucket. Without it, they go to `UPLOAD_DIR` on
disk — which is how local development runs unless you configure it too.

### Why there is no Firebase config in the browser

The Firebase *client* SDK is not used anywhere in this project — not for
Storage, and not for login either. Its config — `apiKey`, `authDomain`,
`projectId` — is public by design and ships inside the JavaScript bundle for
anyone to read in DevTools. Using the Admin SDK server-side instead, and
checking passwords via a server-to-server call to Identity Toolkit, means none
of it exists client-side at all.

This is verifiable, not a promise. Build with the real credentials set and
search the browser bundle:

```bash
grep -rl "BEGIN PRIVATE KEY" .next/static | wc -l   # 0
grep -rl "firebase-admin"    .next/static | wc -l   # 0
```

---

## 4. Create the application

Dokploy → **Applications → Create**, point it at the GitHub repo, build type
**Dockerfile**.

### Environment variables

| Variable | Value |
| --- | --- |
| `ADMIN_EMAIL` | your login address (see step 2) |
| `FIREBASE_SERVICE_ACCOUNT` | base64 service-account JSON (see step 2) |
| `FIREBASE_WEB_API_KEY` | from step 2 |
| `FIREBASE_STORAGE_BUCKET` | `your-project.firebasestorage.app` (see step 3) — omit to use disk instead |
| `UPLOAD_DIR` | `/app/uploads` |
| `SITE_URL` | `https://your-real-domain` |

`SITE_URL` matters more than it looks: `sitemap.xml`, `robots.txt` and
`llms.txt` all emit absolute URLs. Get it wrong and you hand Google a sitemap
full of `localhost`.

### Volume

Mount a persistent volume at **`/app/uploads`**.

Still worth doing even with Firebase configured: it is the fallback path, and it
costs nothing. Without Firebase it is essential — dish photos and the owner's
picture are files on disk, not rows in the database, and every redeploy would
delete them.

---

## 5. Domain and HTTPS

Point the domain at the server, then enable Let's Encrypt in Dokploy. The session
cookie sets its `Secure` flag from `x-forwarded-proto`, so it works on plain HTTP
during setup and tightens automatically once TLS is on. Nothing to change.

---

## 6. First deploy

`docker-entrypoint.sh` runs before the server starts:

1. `seed/seed.mjs` — adds anything missing: 76 dishes, 71 recipes, 6 journal
   posts, Terms and Privacy
2. starts the app

There is no schema to migrate and no database to wait for — Firestore is
schemaless and managed.

The seed only adds what is missing, so redeploys never overwrite your edits.

Then sign in at `https://your-domain/admin` and check the menu is there.

---

## 7. Tell Google

Search Console → add the property → **Sitemaps** → submit `sitemap.xml`.

`llms.txt` needs no submission. AI assistants fetch it themselves.

---

## After launch, in priority order

1. **Dish photos.** 1 of 76 dishes has one. They are the biggest visible
   improvement available, and the menu already sorts photographed dishes first.
2. **Cake prices.** With no options set, `/cakes` shows a "call us" fallback
   instead of the price builder. It works, but the builder is better.
3. **The owner's note.** Admin → Site settings. A placeholder picture is in
   place until you upload a real one.
4. **A contact email.** Blank, so the footer shows only the phone number.

## Worth doing before you depend on it

- **Turn on Firestore backups.** Firebase Console → Firestore → Backups. The
  content is the part that cannot be rebuilt from the repo.
- **Watch the free tier.** Pages are server-rendered on every request, so
  `/menu` costs roughly 77 Firestore reads per view — about 650 views a day
  before the 50K/day free allowance runs out. Caching is a small change if
  traffic ever approaches that.
