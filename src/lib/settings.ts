import "server-only";
import { db } from "./db";

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
  if (existing) return existing;

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
