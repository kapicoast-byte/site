import "server-only";
import { db } from "./db";
import { SETTINGS_DEFAULTS } from "./models";

export type Hours = { day: string; time: string }[];

const DEFAULT_HOURS: Hours = [
  { day: "Monday", time: "6:30 am – 11:00 pm" },
  { day: "Tuesday", time: "6:30 am – 11:00 pm" },
  { day: "Wednesday", time: "6:30 am – 11:00 pm" },
  { day: "Thursday", time: "6:30 am – 11:00 pm" },
  { day: "Friday", time: "6:30 am – 11:45 pm" },
  { day: "Saturday", time: "6:30 am – 11:45 pm" },
  { day: "Sunday", time: "7:00 am – 11:00 pm" },
];

/**
 * Settings is a single row (id = 1). Created on first read so a fresh database
 * never renders an empty site.
 */
export async function getSettings() {
  const existing = await db.settings.findUnique({ where: { id: 1 } });

  /* Defaults underneath, stored values on top.
     Firestore omits absent fields entirely, so a document written before a
     field existed simply has no key for it — and every field added to the
     model from then on arrives as `undefined` at runtime while TypeScript goes
     on promising it is there. That is how `brands` would have reached
     BrandStrip as undefined and thrown on .filter().
     Merging here fixes it once for every field, present and future, instead of
     each reader guarding its own — which is what hoursOf below already had to
     do by hand. */
  if (existing) {
    const stored = Object.fromEntries(
      Object.entries(existing).filter(([, v]) => v !== undefined),
    );
    return { ...SETTINGS_DEFAULTS, ...stored } as typeof existing;
  }

  return db.settings.create({
    data: {
      id: 1,
      hours: DEFAULT_HOURS,
      marquee: [
        "Bun Maska",
        "Kadak Chai",
        "Chaat",
        "Street Eats",
        "Degree Kapi",
        "Jigarthanda",
        "Ghee Roast",
      ],
    },
  });
}

export type SettingsRecord = Awaited<ReturnType<typeof getSettings>>;

/** Hours come back as Json; normalise for the components. */
export function hoursOf(s: SettingsRecord): Hours {
  return Array.isArray(s.hours) ? (s.hours as unknown as Hours) : DEFAULT_HOURS;
}

export function addressLines(s: SettingsRecord) {
  return [s.addressL1, s.addressL2, s.addressL3].filter(Boolean);
}

export function waLink(s: SettingsRecord, text: string) {
  return `https://wa.me/${s.whatsapp}?text=${encodeURIComponent(text)}`;
}
