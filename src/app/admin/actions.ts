"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin, attemptLogin, destroySession } from "@/lib/auth";
import { saveUpload, deleteUpload, UploadError } from "@/lib/uploads";
import { takeLoginAttempt, clearLoginAttempts } from "@/lib/ratelimit";
import type { Prisma } from "@prisma/client";

/** What every form action resolves to. Actions that redirect never return. */
export type ActionState = { ok?: string; error?: string } | null;

/**
 * Every mutation calls requireAdmin() first. Server actions are reachable as
 * POST endpoints, so the session check has to live here — not only in the page
 * that renders the form.
 */

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const num = (f: FormData, k: string, d = 0) => {
  const n = Number(f.get(k));
  return Number.isFinite(n) ? n : d;
};
const bool = (f: FormData, k: string) => f.get(k) === "on" || f.get(k) === "true";
const lines = (f: FormData, k: string) =>
  str(f, k).split("\n").map((s) => s.trim()).filter(Boolean);

function refreshSite() {
  ["/", "/menu", "/journal", "/cakes", "/visit"].forEach((p) => revalidatePath(p));
}

/* ------------------------------------------------------------------ auth -- */

export async function loginAction(_prev: unknown, form: FormData): Promise<ActionState> {
  // Counted before the password is checked, so a wrong guess costs an attempt
  // whether or not it was close. One account and one password means an
  // unlimited form is the entire security model reduced to guessing speed.
  const limit = await takeLoginAttempt();
  if (!limit.ok) {
    return {
      error: `Too many sign-in attempts. Try again in ${limit.retryInMinutes} minute${limit.retryInMinutes === 1 ? "" : "s"}.`,
    };
  }

  const email = str(form, "email");
  const password = String(form.get("password") ?? "");

  // attemptLogin checks the password against Firebase Auth, confirms the
  // account is the allowlisted admin, and — only on success — mints the
  // session cookie itself. One call, so there is no window where a password
  // was verified but no session was created.
  if (!(await attemptLogin(email, password))) {
    // Deliberately vague: don't reveal which half was wrong.
    return { error: "That email and password don't match." };
  }

  await clearLoginAttempts();
  redirect("/admin");
}

export async function logoutAction() {
  await destroySession();
  redirect("/admin/login");
}

/* -------------------------------------------------------------- settings -- */

export async function saveSettings(_prev: unknown, form: FormData): Promise<ActionState> {
  await requireAdmin();

  const hours = [
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
  ].map((day) => ({ day, time: str(form, `hours_${day}`) }));

  await db.settings.update({
    where: { id: 1 },
    data: {
      cafeName: str(form, "cafeName"),
      tamilName: str(form, "tamilName"),
      tagline: str(form, "tagline"),
      heroLine1: str(form, "heroLine1"),
      heroLine2: str(form, "heroLine2"),
      heroEyebrow: str(form, "heroEyebrow"),
      heroBadge: str(form, "heroBadge"),
      heroTrust: str(form, "heroTrust"),
      heroSide: str(form, "heroSide"),
      logoUrl: str(form, "logoUrl"),
      logoDarkUrl: str(form, "logoDarkUrl"),
      heroVideoUrl: str(form, "heroVideoUrl"),
      heroPosterUrl: str(form, "heroPosterUrl"),
      storyImage1Url: str(form, "storyImage1Url"),
      storyImage2Url: str(form, "storyImage2Url"),
      ownerName: str(form, "ownerName"),
      ownerRole: str(form, "ownerRole"),
      ownerPhotoUrl: str(form, "ownerPhotoUrl"),
      ownerNote: str(form, "ownerNote"),
      phone: str(form, "phone"),
      whatsapp: str(form, "whatsapp").replace(/\D/g, ""),
      email: str(form, "email"),
      addressL1: str(form, "addressL1"),
      addressL2: str(form, "addressL2"),
      addressL3: str(form, "addressL3"),
      mapsQuery: str(form, "mapsQuery"),
      hours,
      marquee: lines(form, "marquee"),
    },
  });

  refreshSite();
  revalidatePath("/admin/settings");
  return { ok: "Saved. The site is updated." };
}

/* ------------------------------------------------------------------ menu -- */

export async function saveMenuItem(_prev: unknown, form: FormData): Promise<ActionState> {
  await requireAdmin();

  const id = str(form, "id");
  const ingredients = lines(form, "ingredients").map((l) => {
    const [amt, ...rest] = l.split("|");
    return { amt: (amt ?? "").trim(), txt: rest.join("|").trim() };
  });

  /* Photo. Three ways it can change:
       - a new file was chosen  -> upload it and use that
       - "remove" was ticked    -> clear it
       - otherwise              -> keep whatever the hidden field carries    */
  let imageUrl: string | null = str(form, "imageUrl") || null;
  const photo = form.get("photoFile");
  if (photo instanceof File && photo.size > 0) {
    try {
      const media = await saveUpload(photo, str(form, "name"));
      imageUrl = media.url;
    } catch (e) {
      if (e instanceof UploadError) return { error: e.message };
      return { error: `Photo upload failed: ${(e as Error).message}` };
    }
  }
  if (bool(form, "removePhoto")) imageUrl = null;

  const data = {
    slug: str(form, "slug") || str(form, "name").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    name: str(form, "name"),
    tamil: str(form, "tamil"),
    price: num(form, "price"),
    blurb: str(form, "blurb"),
    accent: str(form, "accent") || "#6B4226",
    imageUrl,
    tags: form.getAll("tags").map(String),
    published: bool(form, "published"),
    order: num(form, "order"),
    time: str(form, "time"),
    serves: str(form, "serves"),
    level: str(form, "level"),
    ingredients,
    steps: lines(form, "steps"),
    note: str(form, "note"),
    categoryId: str(form, "categoryId"),
  };

  if (!data.name) return { error: "The dish needs a name." };
  if (!data.categoryId) return { error: "Pick a category." };

  try {
    if (id) await db.menuItem.update({ where: { id }, data });
    else await db.menuItem.create({ data });
  } catch (e) {
    return { error: `Couldn't save: ${(e as Error).message}` };
  }

  refreshSite();
  revalidatePath("/admin/menu");
  redirect("/admin/menu");
}

export async function deleteMenuItem(form: FormData) {
  await requireAdmin();
  await db.menuItem.delete({ where: { id: str(form, "id") } });
  refreshSite();
  revalidatePath("/admin/menu");
}

/* --------------------------------------------------------------- journal -- */

export async function savePost(_prev: unknown, form: FormData): Promise<ActionState> {
  await requireAdmin();

  const id = str(form, "id");

  // Body is written as plain text. Blank line = new paragraph.
  // "## " prefix = heading, "> " = pull quote, "- " = list item.
  const body: Prisma.InputJsonValue[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) { body.push({ t: "ul", c: list }); list = []; }
  };
  for (const raw of str(form, "body").split("\n")) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    if (line.startsWith("- ")) { list.push(line.slice(2)); continue; }
    flush();
    if (line.startsWith("## ")) body.push({ t: "h", c: line.slice(3) });
    else if (line.startsWith("> ")) body.push({ t: "q", c: line.slice(2) });
    else body.push({ t: "p", c: line });
  }
  flush();

  const data = {
    slug: str(form, "slug") || str(form, "title").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    title: str(form, "title"),
    category: str(form, "category") || "Notes",
    excerpt: str(form, "excerpt"),
    imageUrl: str(form, "imageUrl") || null,
    readMins: num(form, "readMins", 4),
    body: body as unknown as Prisma.InputJsonValue,
    published: bool(form, "published"),
  };

  if (!data.title) return { error: "The post needs a title." };

  try {
    if (id) await db.post.update({ where: { id }, data });
    else await db.post.create({ data });
  } catch (e) {
    return { error: `Couldn't save: ${(e as Error).message}` };
  }

  refreshSite();
  revalidatePath("/admin/journal");
  redirect("/admin/journal");
}

export async function deletePost(form: FormData) {
  await requireAdmin();
  await db.post.delete({ where: { id: str(form, "id") } });
  refreshSite();
  revalidatePath("/admin/journal");
}

/* ----------------------------------------------------------------- pages -- */

export async function savePage(_prev: unknown, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = str(form, "id");
  if (!id) return { error: "Missing page." };

  // Same plain-text format as the journal: blank line = paragraph,
  // "## " = heading, "- " = bullet.
  const body: Prisma.InputJsonValue[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) { body.push({ t: "ul", c: list }); list = []; }
  };
  for (const raw of str(form, "body").split("\n")) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    if (line.startsWith("- ")) { list.push(line.slice(2)); continue; }
    flush();
    if (line.startsWith("## ")) body.push({ t: "h", c: line.slice(3) });
    else body.push({ t: "p", c: line });
  }
  flush();

  try {
    await db.page.update({
      where: { id },
      data: {
        title: str(form, "title"),
        intro: str(form, "intro"),
        body: body as unknown as Prisma.InputJsonValue,
        published: bool(form, "published"),
      },
    });
  } catch (e) {
    return { error: `Couldn't save: ${(e as Error).message}` };
  }

  revalidatePath("/terms");
  revalidatePath("/privacy");
  revalidatePath("/admin/pages");
  return { ok: "Saved. The page is updated." };
}

/* ----------------------------------------------------------------- cakes -- */

export async function saveCakeOption(form: FormData) {
  await requireAdmin();
  const id = str(form, "id");
  await db.cakeOption.update({
    where: { id },
    data: {
      label: str(form, "label"),
      note: str(form, "note"),
      price: num(form, "price"),
      active: bool(form, "active"),
    },
  });
  refreshSite();
  revalidatePath("/admin/cakes");
}

export async function savePackage(form: FormData) {
  await requireAdmin();
  const id = str(form, "id");
  const data = {
    name: str(form, "name"),
    price: str(form, "price"),
    unit: str(form, "unit"),
    items: lines(form, "items"),
    hero: bool(form, "hero"),
    active: bool(form, "active"),
  };
  if (id) await db.package.update({ where: { id }, data });
  else await db.package.create({ data });
  refreshSite();
  revalidatePath("/admin/cakes");
}

export async function deletePackage(form: FormData) {
  await requireAdmin();
  await db.package.delete({ where: { id: str(form, "id") } });
  refreshSite();
  revalidatePath("/admin/cakes");
}

/* ----------------------------------------------------------------- media -- */

export async function uploadMedia(_prev: unknown, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (!files.length) return { error: "Choose at least one file." };

  const saved: string[] = [];
  for (const file of files) {
    try {
      const m = await saveUpload(file, str(form, "alt"));
      saved.push(m.filename);
    } catch (e) {
      if (e instanceof UploadError) return { error: e.message };
      return { error: `Upload failed: ${(e as Error).message}` };
    }
  }

  revalidatePath("/admin/media");
  return { ok: `Uploaded ${saved.length} file${saved.length === 1 ? "" : "s"}.` };
}

export async function removeMedia(form: FormData) {
  await requireAdmin();
  await deleteUpload(str(form, "id"));
  revalidatePath("/admin/media");
}
