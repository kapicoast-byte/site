# Kapi Coast

Full-stack site for the cafe — public pages plus an admin panel where the menu,
journal, cake prices, opening hours, photos and the hero video can all be
changed without touching code.

- **Next.js 15** (App Router, React 19, TypeScript) — frontend and backend in one app
- **PostgreSQL + Prisma** — all content lives in the database
- **Docker** — single image, built for [Dokploy](https://dokploy.com)

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

Two terminals. A `.env` file is already set up with local values, so you
don't need to pass anything on the command line.

**Terminal 1 — the database** (a portable Postgres, nothing installed system-wide):

```bash
cd "C:\Users\224509-3rd BBA\OneDrive\Desktop\kapi-coast"
npm run db:start
```

Leave it running. First time only, in another terminal, create the tables and
load the menu:

```bash
npm run setup
```

**Terminal 2 — the site:**

```bash
cd "C:\Users\224509-3rd BBA\OneDrive\Desktop\kapi-coast"
npm run dev
```

Then open **http://localhost:3000**

### Logging into the admin panel

Go to **http://localhost:3000/admin**

| | |
|---|---|
| Email | `admin@kapicoast.in` |
| Password | `kapicoast123` |

Both come from `.env`. Change them there and restart to use your own.

> `.env` is git-ignored, so these never reach GitHub. Production credentials are
> set separately in Dokploy's Environment tab.

To run the production build locally instead of `npm run dev`:

```bash
npm run build && npm start
```

`npm start` runs the standalone server the same way Docker does — plain
`next start` does **not** work with this config.

If you have Docker, this does everything including the database:

```bash
docker compose up --build
```

## Environment variables

| Variable | What it's for |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `ADMIN_EMAIL` | The one account that can sign in at `/admin` |
| `ADMIN_PASSWORD` | Its password — plain text, or a bcrypt hash (better) |
| `SESSION_SECRET` | Signs the login cookie. **32+ random characters** |
| `UPLOAD_DIR` | Where uploaded images go. `/app/uploads` in Docker |

Generate a good secret:

```bash
openssl rand -base64 32
```

To store the password hashed instead of plain (recommended for production):

```bash
node -e "console.log(require('bcryptjs').hashSync(process.argv[1],10))" "your-password"
```

Paste the `$2a$...` output as `ADMIN_PASSWORD`. The app detects the hash format
automatically.

---

## Deploying to Dokploy

**1 — Push to GitHub**

```bash
git init
git add -A
git commit -m "Kapi Coast site"
git branch -M main
git remote add origin https://github.com/YOUR-NAME/kapi-coast.git
git push -u origin main
```

**2 — Create the database in Dokploy**

Project → **Create Service** → **Database** → **PostgreSQL**. Give it a name and
password, then copy the **internal connection URL** it shows you.

**3 — Create the application**

Project → **Create Service** → **Application**.

- Source: **GitHub** → pick the repo and the `main` branch
- Build type: **Dockerfile**
- Dockerfile path: `Dockerfile`
- Port: **3000**

**4 — Set the environment variables**

In the app's **Environment** tab:

```
DATABASE_URL=<the internal URL from step 2>
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=<bcrypt hash>
SESSION_SECRET=<openssl rand -base64 32>
UPLOAD_DIR=/app/uploads
```

**5 — Add a volume so images survive redeploys**

In the app's **Advanced → Volumes** tab, add a **Volume Mount**:

- Name: `kapi-uploads`
- Mount path: `/app/uploads`

> Skip this and every image the owner uploads disappears on the next deploy.

**6 — Deploy**

Press **Deploy**. On boot the container runs `prisma db push` and then seeds the
starting content — both are safe to repeat, so redeploys never duplicate rows or
overwrite edits.

**7 — Domain**

Add your domain in the **Domains** tab and turn on **HTTPS** (Let's Encrypt).

---

## Using the admin panel

| Page | What you can change |
|---|---|
| **Menu & recipes** | Dishes, prices, descriptions, ingredients, method, show/hide |
| **Journal** | Posts, with a plain-text editor (`## ` heading, `> ` quote, `- ` bullet) |
| **Cakes & packages** | Flavour prices, size multipliers, add-on charges, event packages |
| **Images & video** | Upload files, copy their link, delete them |
| **Site settings** | Name, hero wording, contact, address, opening hours, and every image and video used on the site |

**To swap a photo or the hero video:** upload it under *Images & video*, press
**Copy link**, then paste that link into the matching box in *Site settings* and
save.

---

## Project layout

```
prisma/
  schema.prisma       the content model
  seed.mjs            starting content (idempotent)
src/
  app/
    page.tsx          home
    menu/             menu + recipe drawer
    journal/          list and article pages
    cakes/            cake builder + packages
    visit/            map, hours, contact
    admin/            login, dashboard, editors
    api/uploads/      serves files from the uploads volume
  components/         shared UI
  lib/                db, auth, settings, uploads
public/               logo, video, photos shipped with the repo
uploads/              runtime uploads (git-ignored, Docker volume)
```

---

## Notes

### What's real and what still needs filling in

- **The menu is real.** All 76 dishes, prices and descriptions are transcribed
  from the printed menu card, along with the phone number
  (+91 73822 19403), opening hours (6 am – 10 pm daily) and the tagline.
- **Recipes are empty.** The menu card doesn't contain any. The recipe drawer
  degrades to a clean detail view until you add ingredients and method per dish
  under *Menu & recipes*.
- **Cake prices are all ₹0.** The card advertises custom cakes but lists no
  rates. Set them under *Cakes & packages* before going live.
- **No journal posts.** Seeded empty on purpose. Add real ones under *Journal*.
- **The email address is a guess** (`hello@kapicoast.in`) — the menu card only
  gives a phone number. Change it in *Site settings*.
- Uploads are capped at 25 MB and limited to images, MP4 and WebM.
- Filenames on disk are UUIDs, so a malicious upload name can't escape the
  uploads directory.
- Every admin action re-checks the session server-side — server actions are
  reachable as POST endpoints, so a page-level check alone wouldn't be enough.
