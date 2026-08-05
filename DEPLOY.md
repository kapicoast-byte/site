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

## 2. Make the two secrets

**Session secret** — any long random string. Generate one:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

**Admin password** — hash it so a leaked env var doesn't hand over the account:

```bash
node scripts/hash-password.mjs
```

Type your password when asked; it prints an `ADMIN_PASSWORD=$2b$...` line. The
password itself never touches a file or your shell history. Keep it in a password
manager — there is no reset link, and no second account to let you back in.

---

## 3. Create the Postgres service in Dokploy

Dokploy → **Databases → Create → PostgreSQL**. Note the connection string it
gives you; it becomes `DATABASE_URL`.

---

## 3b. Firebase Storage (for uploaded photos)

Optional, but it is what stops a lost disk volume taking every photo with it.

**Firebase Console → Project settings → Service accounts → Generate new private key.**
That downloads a JSON file. It is a real secret: it bypasses every Firebase
security rule and works from anywhere. Never commit it — `.gitignore` already
refuses the usual filenames.

Base64 it, because the private key inside contains newlines that environment
variable fields mangle:

```bash
base64 -w0 service-account.json
```

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("service-account.json"))
```

Add to Dokploy:

| Variable | Value |
| --- | --- |
| `FIREBASE_SERVICE_ACCOUNT` | the base64 string |
| `FIREBASE_STORAGE_BUCKET` | e.g. `your-project.appspot.com` |

**Leave the bucket private.** Do not add public read rules. Files are proxied
through `/api/uploads/<name>`, so nothing needs direct access and no Google URL
ever appears in the page.

Nothing else changes: the stored filenames and the public URLs are identical to
the disk version, so anything already uploaded keeps working.

With both variables set, uploads go to the bucket. With either missing, they go
to `UPLOAD_DIR` on disk — which is how local development runs, with no Firebase
account needed.

### Why there is no Firebase config in the browser

The Firebase *client* SDK is not used anywhere in this project. Its config —
`apiKey`, `authDomain`, `projectId` — is public by design and ships inside the
JavaScript bundle for anyone to read in DevTools. Using the Admin SDK
server-side instead means none of it exists client-side at all.

This is verifiable, not a promise. Build with a throwaway credential and search
the browser bundle:

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
| `DATABASE_URL` | from step 3 |
| `ADMIN_EMAIL` | your login address |
| `ADMIN_PASSWORD` | the `$2b$...` hash from step 2 |
| `SESSION_SECRET` | the random string from step 2 |
| `UPLOAD_DIR` | `/app/uploads` |
| `SITE_URL` | `https://your-real-domain` |
| `FIREBASE_SERVICE_ACCOUNT` | base64 service-account JSON (see 3b) |
| `FIREBASE_STORAGE_BUCKET` | `your-project.appspot.com` (see 3b) |

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

1. `prisma db push` — creates the tables
2. `prisma/seed.mjs` — loads 76 dishes, 71 recipes, 6 journal posts, Terms and Privacy
3. starts the app

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

- **Back up two things, not one.** The Postgres database *and* the uploads
  volume. Backing up one does not cover the other.
- **Switch to Prisma migrations.** The schema is applied with `db push`, which
  is fine for adding fields but can drop a column's data on a rename. Worth
  changing once the content matters.
