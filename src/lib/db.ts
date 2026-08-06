import "server-only";
import { Timestamp, FieldPath } from "firebase-admin/firestore";
import { firestore } from "./firebase";
import type {
  Category,
  MenuItem,
  MenuItemWithCategory,
  Post,
  Page,
  CakeOption,
  Package,
  Media,
  Settings,
} from "./models";
import { SETTINGS_DEFAULTS } from "./models";

/**
 * The data layer, backed by Firestore.
 *
 * This deliberately mimics the small slice of the Prisma client the app
 * actually used, rather than exposing Firestore's own API. Twenty-one files
 * and seventy call sites were written against `db.menuItem.findMany({ where,
 * orderBy })` and friends; reproducing that shape here meant the migration
 * touched the data layer and the seed script instead of every page.
 *
 * It is not a general Prisma emulator and does not try to be. It supports
 * exactly the operations this app performs, and throws loudly on anything
 * else, so an unsupported query fails immediately and visibly rather than
 * silently returning the wrong rows.
 *
 * Three design decisions worth knowing:
 *
 *  1. Sorting and `take` happen in memory, never in Firestore. Firestore needs
 *     a hand-built composite index for any multi-field sort, and this app has
 *     three of them. The collections here are small — 76 dishes is the largest
 *     — so sorting in JS costs nothing measurable and removes an entire class
 *     of "the query works locally but the index is missing in production"
 *     failure.
 *
 *  2. Equality filters DO go to Firestore, because those use automatic
 *     single-field indexes and genuinely reduce billed reads.
 *
 *  3. Category is denormalised onto each menu item (`categorySlug`,
 *     `categoryLabel`). Firestore has no joins, and `include: { category: true }`
 *     was used on the two hottest queries in the app. Denormalising costs a
 *     write when a category is renamed — handled in the seed — and saves a read
 *     per dish on every page view.
 */

/* ------------------------------------------------------------------ types -- */

type Order = Record<string, "asc" | "desc">;
type Where = Record<string, unknown>;

type FindManyArgs = {
  where?: Where;
  orderBy?: Order | Order[];
  select?: Record<string, unknown>;
  take?: number;
  include?: Record<string, unknown>;
};

/** Anything stored here has a string id; the rest is the model's own shape. */
type Doc = { id: string } & Record<string, unknown>;

/* -------------------------------------------------------------- utilities -- */

/** Firestore Timestamps are not Dates, and every caller expects a Date. */
function reviveDates(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate();
  if (Array.isArray(value)) return value.map(reviveDates);
  if (value && typeof value === "object" && value.constructor === Object) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = reviveDates(v);
    return out;
  }
  return value;
}

function fromSnapshot<T>(snap: FirebaseFirestore.DocumentSnapshot): T | null {
  if (!snap.exists) return null;
  return { ...(reviveDates(snap.data()) as Record<string, unknown>), id: snap.id } as T;
}

/** Does a document satisfy a `where` clause we could not push to Firestore? */
function matches(doc: Record<string, unknown>, where: Where): boolean {
  for (const [field, condition] of Object.entries(where)) {
    if (field === "NOT") {
      if (matches(doc, condition as Where)) return false;
      continue;
    }
    const actual = doc[field];

    if (condition && typeof condition === "object" && !(condition instanceof Date)) {
      const c = condition as Record<string, unknown>;
      if ("not" in c) {
        if (c.not === null ? actual === null || actual === undefined : actual === c.not) {
          return false;
        }
        continue;
      }
      if ("startsWith" in c) {
        if (typeof actual !== "string" || !actual.startsWith(String(c.startsWith))) {
          return false;
        }
        continue;
      }
      // Prisma's array-contains, used for the "counter favourite" tag on the
      // home page. Evaluated here rather than pushed to Firestore's
      // array-contains: combining it with another equality filter would need a
      // composite index, and these collections are far too small to justify
      // one.
      if ("has" in c) {
        if (!Array.isArray(actual) || !actual.includes(c.has)) return false;
        continue;
      }
      throw new Error(`db: unsupported filter on "${field}": ${JSON.stringify(c)}`);
    }

    if (actual !== condition) return false;
  }
  return true;
}

function sortDocs<T>(docs: T[], orderBy?: Order | Order[]): T[] {
  if (!orderBy) return docs;
  const rules = Array.isArray(orderBy) ? orderBy : [orderBy];

  return [...docs].sort((a, b) => {
    for (const rule of rules) {
      const [field, dir] = Object.entries(rule)[0] as [string, "asc" | "desc"];
      const av = (a as Record<string, unknown>)[field];
      const bv = (b as Record<string, unknown>)[field];
      if (av === bv) continue;

      // undefined/null sort last regardless of direction, so a missing field
      // never jumps to the top of a list.
      if (av === undefined || av === null) return 1;
      if (bv === undefined || bv === null) return -1;

      let cmp: number;
      if (av instanceof Date && bv instanceof Date) cmp = av.getTime() - bv.getTime();
      else if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
      else cmp = String(av).localeCompare(String(bv));

      if (cmp !== 0) return dir === "desc" ? -cmp : cmp;
    }
    return 0;
  });
}

function project<T>(doc: T, select?: Record<string, unknown>): T {
  if (!select) return doc;
  const src = doc as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [field, wanted] of Object.entries(select)) {
    if (wanted) out[field] = src[field];
  }
  return out as T;
}

/** Splits a `where` into what Firestore can index and what we filter in JS. */
function splitWhere(where: Where = {}) {
  const pushable: [string, unknown][] = [];
  const local: Where = {};
  for (const [field, condition] of Object.entries(where)) {
    const simple =
      condition === null ||
      typeof condition === "string" ||
      typeof condition === "number" ||
      typeof condition === "boolean";
    // Equality on a real field uses an automatic index. Anything else — `not`,
    // `startsWith`, `NOT` — is evaluated after fetching.
    if (simple && field !== "NOT" && condition !== null) pushable.push([field, condition]);
    else local[field] = condition;
  }
  return { pushable, local };
}

/* ----------------------------------------------------------- the repository */

function collection<T extends { id: string }>(name: string) {
  const col = () => firestore().collection(name);

  async function findMany(args: FindManyArgs = {}): Promise<T[]> {
    const { pushable, local } = splitWhere(args.where);

    let q: FirebaseFirestore.Query = col();
    for (const [field, value] of pushable) q = q.where(field, "==", value);

    const snap = await q.get();
    let docs = snap.docs.map((d) => fromSnapshot<T>(d)!).filter(Boolean);

    if (Object.keys(local).length) {
      docs = docs.filter((d) => matches(d as Record<string, unknown>, local));
    }
    docs = sortDocs(docs, args.orderBy);
    if (typeof args.take === "number") docs = docs.slice(0, args.take);

    return args.select ? docs.map((d) => project(d, args.select)) : docs;
  }

  return {
    findMany,

    async findFirst(args: FindManyArgs = {}): Promise<T | null> {
      const rows = await findMany({ ...args, take: 1 });
      return rows[0] ?? null;
    },

    /**
     * `where` accepts `{ id }` or any other single unique field (`slug` here).
     * An id lookup is a direct document get; anything else is a query.
     */
    async findUnique({ where }: { where: Where }): Promise<T | null> {
      const keys = Object.keys(where);
      if (keys.length === 1 && keys[0] === "id") {
        const snap = await col().doc(String(where.id)).get();
        return fromSnapshot<T>(snap);
      }
      const rows = await findMany({ where, take: 1 });
      return rows[0] ?? null;
    },

    async count({ where }: { where?: Where } = {}): Promise<number> {
      const { pushable, local } = splitWhere(where);
      let q: FirebaseFirestore.Query = col();
      for (const [field, value] of pushable) q = q.where(field, "==", value);

      // The aggregate count() is a single billed read instead of one per
      // document — but only usable when nothing needs filtering in JS.
      if (!Object.keys(local).length) {
        const agg = await q.count().get();
        return agg.data().count;
      }
      const snap = await q.get();
      return snap.docs
        .map((d) => fromSnapshot<T>(d)!)
        .filter((d) => matches(d as Record<string, unknown>, local)).length;
    },

    async create({ data }: { data: Record<string, unknown> }): Promise<T> {
      const { id, ...rest } = data as { id?: string } & Record<string, unknown>;
      const now = new Date();
      const payload = { createdAt: now, updatedAt: now, ...rest };
      const ref = id ? col().doc(String(id)) : col().doc();
      await ref.set(payload);
      return { ...(payload as Record<string, unknown>), id: ref.id } as T;
    },

    async update({
      where,
      data,
    }: {
      where: Where;
      data: Record<string, unknown>;
    }): Promise<T> {
      const target =
        Object.keys(where).length === 1 && "id" in where
          ? String(where.id)
          : (await findMany({ where, take: 1 }))[0]?.id;

      if (!target) throw new Error(`db: no document matched ${JSON.stringify(where)}`);

      const ref = col().doc(target);
      await ref.set({ ...data, updatedAt: new Date() }, { merge: true });
      return (await findUniqueById(ref))!;
    },

    async upsert({
      where,
      create,
      update,
    }: {
      where: Where;
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }): Promise<T> {
      const existing = (await findMany({ where, take: 1 }))[0];
      if (!existing) {
        const { id, ...rest } = create as { id?: string } & Record<string, unknown>;
        const now = new Date();
        const ref = id ? col().doc(String(id)) : col().doc();
        await ref.set({ createdAt: now, updatedAt: now, ...rest });
        return (await findUniqueById(ref))!;
      }
      if (Object.keys(update).length) {
        await col().doc(existing.id).set({ ...update, updatedAt: new Date() }, { merge: true });
      }
      return (await findUniqueById(col().doc(existing.id)))!;
    },

    async delete({ where }: { where: Where }): Promise<void> {
      const target =
        Object.keys(where).length === 1 && "id" in where
          ? String(where.id)
          : (await findMany({ where, take: 1 }))[0]?.id;
      if (target) await col().doc(target).delete();
    },
  };

  async function findUniqueById(ref: FirebaseFirestore.DocumentReference) {
    return fromSnapshot<T>(await ref.get());
  }
}

/* ---------------------------------------------------------------- menuItem */

/**
 * Menu items need `include: { category: true }`, which Firestore cannot do.
 * The category's slug and label are denormalised onto each dish, so this just
 * reassembles them into the nested shape the pages already expect.
 */
function menuItemCollection() {
  const base = collection<MenuItem>("menuItems");

  const withCategory = (doc: MenuItem | null): MenuItemWithCategory | null => {
    if (!doc) return null;
    return {
      ...doc,
      category: {
        id: doc.categoryId ?? "",
        slug: doc.categorySlug ?? "",
        label: doc.categoryLabel ?? "",
      },
    };
  };

  return {
    ...base,
    async findMany(args: FindManyArgs = {}): Promise<MenuItemWithCategory[]> {
      const rows = await base.findMany(args);
      return rows.map((r) => withCategory(r)!);
    },
    async findUnique(args: {
      where: Where;
      include?: Record<string, unknown>;
    }): Promise<MenuItemWithCategory | null> {
      return withCategory(await base.findUnique(args));
    },
    async findFirst(args: FindManyArgs = {}): Promise<MenuItemWithCategory | null> {
      return withCategory(await base.findFirst(args));
    },
  };
}

/* --------------------------------------------------------------- settings -- */

/**
 * Settings was a single Postgres row keyed on the integer 1. Firestore wants a
 * document id, so it lives at settings/main — and `id: 1` is preserved on the
 * way out purely so existing callers keep working unchanged.
 */
const SETTINGS_DOC = "main";

const settings = {
  async findUnique(_args?: { where?: Where }): Promise<Settings | null> {
    const snap = await firestore().collection("settings").doc(SETTINGS_DOC).get();
    const doc = fromSnapshot<Settings>(snap);
    return doc ? { ...doc, id: 1 } : null;
  },
  async create({ data }: { data: Record<string, unknown> }): Promise<Settings> {
    const { id: _ignored, ...rest } = data as Record<string, unknown>;
    const payload = { ...SETTINGS_DEFAULTS, ...rest, updatedAt: new Date() };
    await firestore().collection("settings").doc(SETTINGS_DOC).set(payload, { merge: true });
    return { ...payload, id: 1 } as Settings;
  },
  async update({ data }: { where?: Where; data: Record<string, unknown> }): Promise<Settings> {
    await firestore()
      .collection("settings")
      .doc(SETTINGS_DOC)
      .set({ ...data, updatedAt: new Date() }, { merge: true });
    return (await settings.findUnique())!;
  },
  async upsert({
    create,
    update,
  }: {
    where?: Where;
    create: Record<string, unknown>;
    update: Record<string, unknown>;
  }): Promise<Settings> {
    const existing = await settings.findUnique();
    return existing && Object.keys(update).length
      ? settings.update({ data: update })
      : existing
        ? existing
        : settings.create({ data: create });
  },
};

/* -------------------------------------------------------------------- api -- */

export const db = {
  settings,
  category: collection<Category>("categories"),
  menuItem: menuItemCollection(),
  post: collection<Post>("posts"),
  page: collection<Page>("pages"),
  cakeOption: collection<CakeOption>("cakeOptions"),
  package: collection<Package>("packages"),
  media: collection<Media>("media"),
};

export { FieldPath };
