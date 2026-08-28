/**
 * Generate a photo for every menu item through OpenRouter, then brand it.
 *
 *   node scripts/gen-dish-images.mjs                 # dry run: prompts + cost, spends nothing
 *   node scripts/gen-dish-images.mjs --go --limit=3  # try a few first
 *   node scripts/gen-dish-images.mjs --go            # the rest
 *   node scripts/gen-dish-images.mjs --relogo        # re-brand what exists, no API calls
 *
 * Look: white studio background, Andhra-style plate for food, a plain glass for
 * drinks, and the Kapi Coast logo across the top.
 *
 * The logo is NOT asked for in the prompt — image models render wordmarks as
 * mangled pseudo-text. It is composited afterwards from the real asset, so it
 * is pixel-correct every time. public/img/logo-nav.png is cream and gold
 * (luminance 221), which disappears on white, so it sits on a dark pill.
 *
 * Reads OPENROUTER_API_KEY from .env. Writes public/dishes/<id>.png plus
 * manifest.json, and skips anything already generated, so a failed run only
 * costs what it had not done. Nothing here touches Firestore — attaching the
 * images to dishes is a separate, deliberate step.
 */
import { readFile, writeFile, mkdir, access, readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "public", "dishes");
const RAW_DIR = path.join(OUT_DIR, "raw");
const MANIFEST = path.join(OUT_DIR, "manifest.json");
const LOGO = path.join(ROOT, "public", "img", "logo-nav.png");

const args = process.argv.slice(2);
const GO = args.includes("--go");
const RELOGO = args.includes("--relogo");
const FORCE = args.includes("--force");   // regenerate even if the file exists
const NO_LOGO = args.includes("--no-logo");
const arg = (n) => args.find((a) => a.startsWith(`--${n}=`))?.split("=")[1];
const ONLY = arg("only")?.split(",").map((s) => s.trim()).filter(Boolean);
const LIMIT = Number(arg("limit") || 0);
const MODEL = arg("model") || "google/gemini-2.5-flash-image";
/* OpenRouter reserves credit per in-flight request, so a high concurrency can
   trip a 402 while the balance is still healthy. Two is safe. */
const CONCURRENCY = Number(arg("concurrency") || 2);

async function apiKey() {
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY;
  try {
    const m = (await readFile(path.join(ROOT, ".env"), "utf8")).match(/^OPENROUTER_API_KEY\s*=\s*(.+)$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  } catch {}
  return null;
}

/* ---- prompt ------------------------------------------------------------ */

/* Trademarked products get a generic description. An AI rendering of a Coke
   bottle or a KitKat is someone else's trademark, and this is a real cafe's
   public menu, not a mood board. */
const GENERIC = {
  "Coke (400 ml)": "a glass of dark cola over ice, unbranded",
  "Fanta (400 ml)": "a glass of orange soda over ice, unbranded",
  "Sprite (400 ml)": "a glass of clear lemon-lime soda over ice, unbranded",
  "Glass Bottle": "a plain unlabelled glass bottle of chilled soft drink",
  "Water Bottle (1 L)": "a plain unlabelled bottle of drinking water",
  Horlicks: "a glass of hot malted milk, unbranded",
  Boost: "a glass of hot chocolate malt drink, unbranded",
  Oreo: "a dark chocolate-cookie milkshake, crushed cookie crumb on top, unbranded",
  "Lotus Biscoff": "a caramelised-biscuit milkshake, biscuit crumb on top, unbranded",
  KitKat: "a chocolate wafer milkshake, wafer pieces on top, unbranded",
};

/* Clean white studio product shot. Deliberately flat and consistent: 76 of
   these sit in one grid, so the set matters more than any single frame. */
const STYLE =
  "Professional food product photography on a pure white seamless background. " +
  "Bright even studio lighting, soft natural shadow directly under the item, " +
  "shot at a 45 degree angle, sharp focus throughout, appetising and fresh. " +
  "The item fills most of the frame and is centred. " +
  "Absolutely no text, no lettering, no logos, no watermarks, no labels, " +
  "no packaging, no hands, no people, no props, no background objects. " +
  "Square 1:1 composition.";

/* Drinks land in a plain glass; food lands on an Andhra-style plate. */
const DRINK_CATS = new Set(["hot-drinks", "cold-drinks", "fresh-juice", "milkshakes"]);
const PLATE =
  "served on a traditional South Indian Andhra style plate — a round stainless " +
  "steel thali plate with a simple raised rim, clean and polished";
const GLASS = {
  /* Ribbed glass, per the reference photo: the fluting catches the light and
     shows the colour of the tea through it. */
  "hot-drinks": "served in a clear ribbed fluted glass tumbler, steam rising gently",
  "cold-drinks": "served in a plain tall clear glass with ice and condensation",
  "fresh-juice": "served in a plain tall clear glass, freshly poured",
  milkshakes: "served in a plain tall clear glass, thick and cold",
};

/**
 * Hand-written subjects for items the generic "name — blurb" line renders
 * badly. A dish name alone gives the model too much room: "Mirchi Bajji" came
 * back as five pale uniform fritters, which is not what the fryer produces.
 */
const OVERRIDES = {
  "Mirchi Bajji":
    "Andhra mirchi bajji — three large fat pale-green chillies, each slit " +
    "lengthways and stuffed with spiced potato masala, coated in a thick " +
    "golden gram-flour batter and deep fried until deeply golden, crisp and " +
    "blistered with an uneven craggy crust. One is broken open to show the " +
    "stuffing and the chilli inside. Scattered with chaat masala and finely " +
    "chopped raw onion and a wedge of lime",
  "Masala Tea":
    "South Indian masala chai — rich creamy tan-brown spiced milk tea with a " +
    "thick frothy head, freshly poured and still moving, steam rising",
  "Ginger Tea":
    "South Indian ginger milk tea — creamy tan-brown, thick frothy head, " +
    "freshly poured, steam rising, a small piece of fresh ginger beside the glass",
  "Filter Coffee":
    "South Indian degree filter coffee — deep tan, strong decoction and hot " +
    "milk pulled tall so it carries a thick creamy froth on top, steam rising",

  /* These are Rs 50 tea cakes sold by the piece, so the shot is a single slice
     photographed from the side with the layers showing. A whole round cake
     reads as something you order for a birthday, not something you buy with a
     coffee. */
  ...Object.fromEntries(
    [
      ["Vanilla Cake", "soft vanilla sponge, white cream between the layers, a light dusting of icing sugar on top"],
      ["Chocolate Cake", "moist dark chocolate sponge, chocolate cream between the layers, a chocolate curl on top"],
      ["Black Forest Cake", "dark chocolate sponge, whipped white cream between the layers, glossy dark cherries and chocolate shavings on top"],
      ["Strawberry Cake", "pale sponge, whipped white cream between the layers, fresh halved strawberries on top"],
      ["Pista Cake", "pale green pistachio sponge, cream between the layers, chopped pistachios scattered on top"],
      ["Blueberry Cake", "pale sponge, whipped white cream between the layers, fresh blueberries on top"],
    ].map(([name, detail]) => [
      name,
      "a single tall triangular slice of layered " + detail +
        ", cut clean and standing on its base, photographed from the side at " +
        "eye level so the sponge and cream layers are clearly visible, a " +
        "little fresh fruit and a small mint sprig beside it",
    ])
  ),
};

function promptFor(d) {
  const subject = OVERRIDES[d.name] || GENERIC[d.name] || `${d.name}${d.blurb ? ` — ${d.blurb}` : ""}`;
  const vessel = DRINK_CATS.has(d.cat) ? GLASS[d.cat] : PLATE;
  return `${subject}, ${vessel}. ${STYLE}`;
}

/* ---- branding ---------------------------------------------------------- */
/**
 * Lay the real logo across the top on a dark pill, so it reads against the
 * white background and stays identical on all 76.
 */
async function brand(buffer) {
  /* At the size the menu actually renders these — a ~72px thumbnail — the
     wordmark is an illegible dark smudge sitting over the food. The badge only
     ever read at full size, which is not where anyone sees it. */
  if (NO_LOGO) return buffer;

  const img = sharp(buffer);
  const { width = 1024, height = 1024 } = await img.metadata();

  const padY = Math.round(height * 0.035);
  const pillH = Math.round(height * 0.15);
  const logoH = Math.round(pillH * 0.62);

  /* The asset is 160x160 but the mark only occupies 135x94 of it. Trimming the
     transparent margin first makes the wordmark ~50% larger in the same pill,
     which is the difference between legible and a smudge at this size. */
  const logo = await sharp(LOGO).trim({ threshold: 10 }).resize({ height: logoH }).toBuffer();
  const logoW = (await sharp(logo).metadata()).width ?? logoH;

  const pillW = Math.round(logoW + pillH * 0.9);
  const pillX = Math.round((width - pillW) / 2);
  const r = Math.round(pillH / 2);

  const pill = Buffer.from(
    `<svg width="${pillW}" height="${pillH}" xmlns="http://www.w3.org/2000/svg">
       <rect x="0" y="0" width="${pillW}" height="${pillH}" rx="${r}" ry="${r}"
             fill="#100C08" fill-opacity="0.94"/>
     </svg>`
  );

  return img
    .composite([
      { input: pill, top: padY, left: pillX },
      {
        input: logo,
        top: padY + Math.round((pillH - logoH) / 2),
        left: pillX + Math.round((pillW - logoW) / 2),
      },
    ])
    .png()
    .toBuffer();
}

/* ---- generation -------------------------------------------------------- */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * OpenRouter holds a rolling "in-flight budget" that a burst of image requests
 * drains, and it answers 402 with reason `in_flight_budget_exhausted` and a
 * Retry-After even while the account balance is healthy. That is a wait, not a
 * failure, so honour the header and retry rather than dropping the dish.
 */
async function generate(dish, key, attempt = 0) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://kapicoast.in",
      "X-Title": "Kapi Coast menu imagery",
    },
    body: JSON.stringify({
      model: MODEL,
      modalities: ["image", "text"],
      messages: [{ role: "user", content: promptFor(dish) }],
    }),
  });
  if (res.status === 402 && attempt < 6) {
    const body = await res.text();
    if (body.includes("in_flight_budget_exhausted")) {
      const wait = (Number(res.headers.get("Retry-After")) || 120) + 15;
      console.log(`       in-flight budget drained, waiting ${wait}s (attempt ${attempt + 1}/6)`);
      await sleep(wait * 1000);
      return generate(dish, key, attempt + 1);
    }
    throw new Error(`HTTP 402: ${body.slice(0, 200)}`);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 250)}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message || JSON.stringify(json.error));
  const url = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!url) throw new Error(`no image (finish: ${json.choices?.[0]?.finish_reason})`);
  const b64 = url.split(",")[1];
  if (!b64) throw new Error("not a data URL");
  return { buffer: Buffer.from(b64, "base64"), usage: json.usage || null, cost: json.usage?.cost ?? null };
}

/* ---- run --------------------------------------------------------------- */
const seed = JSON.parse(await readFile(path.join(ROOT, "seed", "seed-data.json"), "utf8"));
let dishes = seed.menu;
if (ONLY) dishes = dishes.filter((d) => ONLY.includes(d.cat));
if (LIMIT) dishes = dishes.slice(0, LIMIT);

await mkdir(RAW_DIR, { recursive: true });
let manifest = {};
try { manifest = JSON.parse(await readFile(MANIFEST, "utf8")); } catch {}

/* Re-brand from the cached originals — free, and how you iterate on the badge
   without paying to regenerate the photography. */
if (RELOGO) {
  const files = (await readdir(RAW_DIR)).filter((f) => f.endsWith(".png"));
  for (const f of files) {
    await writeFile(path.join(OUT_DIR, f), await brand(await readFile(path.join(RAW_DIR, f))));
    console.log(NO_LOGO ? "  logo removed " + f : "  re-branded " + f);
  }
  console.log(`\n${files.length} re-branded from cache. No API calls, no cost.`);
  process.exit(0);
}

const todo = [];
for (const d of dishes) {
  if (FORCE) { todo.push(d); continue; }
  try { await access(path.join(OUT_DIR, `${d.id}.png`)); } catch { todo.push(d); }
}

console.log(`model        ${MODEL}`);
console.log(`dishes       ${dishes.length} selected, ${todo.length} to generate`);
console.log(`look         white background · ${DRINK_CATS.size} drink categories in a plain glass · rest on an Andhra thali`);
console.log(`logo         composited after generation from public/img/logo-nav.png, on a dark pill\n`);

if (!GO) {
  console.log("DRY RUN — nothing generated, nothing spent. Add --go to run.\n");
  for (const d of [todo.find((x) => !DRINK_CATS.has(x.cat)), todo.find((x) => DRINK_CATS.has(x.cat))].filter(Boolean))
    console.log(`  ${d.name} [${d.cat}]\n    ${promptFor(d)}\n`);
  console.log(`Rough cost for ${todo.length}: ~$${(todo.length * 0.039).toFixed(2)} on ${MODEL}`);
  process.exit(0);
}

const key = await apiKey();
if (!key) {
  console.error("No OPENROUTER_API_KEY in .env or environment.");
  process.exit(1);
}

let done = 0, failed = 0, spent = 0;
const queue = [...todo];
async function worker() {
  while (queue.length) {
    const d = queue.shift();
    try {
      const { buffer, usage, cost } = await generate(d, key);
      await writeFile(path.join(RAW_DIR, `${d.id}.png`), buffer);   // cache the unbranded original
      const branded = await brand(buffer);
      await writeFile(path.join(OUT_DIR, `${d.id}.png`), branded);
      if (cost) spent += cost;
      manifest[d.id] = { name: d.name, cat: d.cat, model: MODEL, prompt: promptFor(d), at: new Date().toISOString(), bytes: branded.length, usage, cost };
      await writeFile(MANIFEST, JSON.stringify(manifest, null, 2));
      console.log(`  ok    ${String(++done).padStart(3)}/${todo.length}  ${d.name} (${Math.round(branded.length / 1024)} KB${cost ? `, $${cost.toFixed(4)}` : ""})`);
    } catch (e) {
      failed++;
      console.log(`  FAIL       ${d.name}: ${e.message.slice(0, 110)}`);
    }
  }
}
await Promise.all(Array.from({ length: Math.min(CONCURRENCY, todo.length) }, worker));
console.log(`\n${done} generated, ${failed} failed${spent ? `, $${spent.toFixed(4)} spent` : ""}.`);
console.log("Originals cached in public/dishes/raw/ — use --relogo to restyle the badge for free.");
