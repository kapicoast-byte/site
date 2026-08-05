/**
 * Generates prisma/seed-data.json from the real Kapi Coast menu card.
 *
 * Everything here is transcribed from the printed menu PDF — names, prices and
 * the one-line descriptions. Nothing is invented. Recipes are intentionally
 * empty: the menu card doesn't contain any, so they're left for the owner to
 * fill in from the admin panel.
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const slug = (s) =>
  s.toLowerCase().replace(/[()]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** [category slug, label, accent, [ [name, price, blurb, tags?], ... ] ] */
const MENU = [
  ["hot-drinks", "Hot Drinks", "#7A4A1C", [
    ["Filter Coffee", 40, "South Indian decoction & milk", ["veg", "star"]],
    ["Masala Tea", 35, "Spiced milk chai", ["veg", "star"]],
    ["Ginger Tea", 35, "Fresh ginger milk tea", ["veg"]],
    ["Black Coffee", 30, "Bold brewed, no milk", ["veg"]],
    ["Black Tea", 30, "Light brewed, no milk", ["veg"]],
    ["Lemon & Honey Tea", 30, "Soothing lemon & honey", ["veg"]],
    ["Milk", 30, "Hot plain milk", ["veg"]],
    ["Horlicks", 45, "Warm malted milk", ["veg"]],
    ["Boost", 45, "Hot chocolate-malt drink", ["veg"]],
    ["Badam Milk", 45, "Hot almond-saffron milk", ["veg"]],
  ]],

  ["cold-drinks", "Cold Drinks", "#2F4230", [
    ["Cold Coffee", 120, "Chilled, creamy & lightly sweet", ["veg", "star"]],
    ["Coke (400 ml)", 20, "Chilled cola", ["veg"]],
    ["Fanta (400 ml)", 20, "Chilled orange soda", ["veg"]],
    ["Sprite (400 ml)", 20, "Chilled lemon-lime soda", ["veg"]],
    ["Glass Bottle", 10, "Coke · Fanta · Sprite · Limca", ["veg"]],
    ["Water Bottle (1 L)", 20, "Packaged drinking water", ["veg"]],
  ]],

  ["fresh-juice", "Fresh Juice", "#8C3A57", [
    ["Watermelon", 100, "Freshly pressed, no sugar", ["veg"]],
    ["Pomegranate", 100, "Ruby-red pressed juice", ["veg"]],
    ["Apple", 100, "Freshly pressed apple", ["veg"]],
    ["Orange", 100, "Freshly squeezed oranges", ["veg"]],
    ["Musk Melon", 100, "Sweet, cooling & fresh", ["veg"]],
    ["Dragon Fruit", 100, "Freshly blended dragon fruit", ["veg"]],
    ["Pineapple", 100, "Sweet-tart pressed pineapple", ["veg"]],
  ]],

  ["milkshakes", "Milkshakes", "#6A2E3E", [
    ["Oreo", 120, "Cookies-and-cream, blended thick", ["veg", "star"]],
    ["Lotus Biscoff", 120, "Caramelised biscuit shake", ["veg"]],
    ["KitKat", 120, "Chocolate-wafer shake", ["veg"]],
    ["Chocolate", 120, "Rich cocoa milkshake", ["veg"]],
    ["Vanilla", 80, "Classic creamy vanilla", ["veg"]],
    ["Rose Milk", 80, "Chilled milk with rose", ["veg"]],
    ["Badam Milk (Cold)", 80, "Chilled almond-saffron milk", ["veg"]],
  ]],

  ["andhra-snacks", "Andhra Snacks", "#A5432A", [
    ["Mirchi Bajji", 15, "Long chilli in gram-flour batter", ["veg", "hot", "star"]],
    ["Medhu Vada", 15, "Fluffy urad-dal doughnut", ["veg"]],
    ["Masala Vada", 15, "Spiced chana-dal patty", ["veg", "hot"]],
    ["Onion Bonda", 15, "Golden onion-potato fritter", ["veg"]],
    ["Raw Banana Bajji", 15, "Plantain in spiced batter", ["veg"]],
    ["Aloo Bajji", 15, "Potato fried golden in batter", ["veg"]],
    ["Onion Pakoda", 15, "Crispy spiced onion fritters", ["veg", "hot"]],
    ["Samosa", 20, "Flaky pastry, spiced potato", ["veg"]],
    ["French Fries", 80, "Crisp golden salted fries", ["veg"]],
    ["Punugulu (14 pc)", 50, "Fried dosa-batter dumplings", ["veg", "star"]],
  ]],

  ["tiffin", "Tiffin", "#94491F", [
    ["Idly (2)", 45, "Steamed cakes, chutney & sambar", ["veg"]],
    ["Idly Vada", 50, "2 idly + 1 vada combo", ["veg"]],
    ["Sambar Idly", 50, "Idly soaked in hot sambar", ["veg"]],
    ["Sambar Vada", 50, "Vada soaked in hot sambar", ["veg"]],
    ["Podi Idly", 50, "Tossed in spiced podi & ghee", ["veg", "star"]],
  ]],

  ["chaat", "Chaat", "#B0432A", [
    ["Pani Puri", 70, "Crisp puris, tangy spiced water", ["veg", "hot", "star"]],
    ["Dahi Puri", 80, "Puris, yoghurt & chutneys", ["veg"]],
    ["Bhel Puri", 80, "Puffed rice, tangy & crunchy", ["veg"]],
    ["Pappadi Chaat", 100, "Crackers, yoghurt & chutneys", ["veg"]],
  ]],

  ["snacks", "Snacks", "#8E5A22", [
    ["Bread Omelette", 70, "Fluffy egg omelette with toast", []],
    ["Veg Sandwich", 100, "Grilled veggies & chutney", ["veg"]],
    ["Paneer Sandwich", 150, "Spiced paneer, grilled crisp", ["veg"]],
    ["Veg Puff", 60, "Flaky pastry, spiced veg", ["veg", "star"]],
    ["Egg Puff", 80, "Flaky pastry, spiced egg", []],
  ]],

  ["buns", "Buns", "#A97C3F", [
    ["Jam Bun", 60, "Soft bun with fruit jam", ["veg"]],
    ["Maska Bun", 60, "Soft bun slathered with butter", ["veg", "star"]],
    ["Bun Butter Jam", 100, "Loaded with butter & jam", ["veg"]],
    ["Cheese Garlic Bun", 80, "Toasted, cheese & garlic butter", ["veg"]],
  ]],

  ["pizza", "Pizza", "#9E4A3C", [
    ["Margherita", 150, "8 inch · tomato, cheese & basil", ["veg"]],
    ["Veg Pizza", 180, "8 inch · loaded veggies & cheese", ["veg"]],
  ]],

  ["pasta", "Pasta", "#7C6B24", [
    ["White Sauce Pasta", 75, "Creamy cheese & herb sauce", ["veg"]],
    ["Red Sauce Pasta", 75, "Tangy tomato & basil sauce", ["veg"]],
  ]],

  ["cookies", "Cookies", "#8A6A22", [
    ["Butter Cookie", 10, "Crisp, buttery, melt-in-mouth", ["veg"]],
    ["Salt Cookie", 10, "Lightly salted, crisp bite", ["veg"]],
    ["Butter Almond", 15, "Buttery, topped with almond", ["veg"]],
  ]],

  ["doughnuts", "Doughnuts", "#5B3A5A", [
    ["Chocolate Doughnut", 80, "Glazed with rich chocolate", ["veg"]],
    ["Almond Doughnut", 80, "Topped with toasted almond", ["veg"]],
    ["Pistachio Doughnut", 80, "Topped with crushed pista", ["veg"]],
  ]],

  ["dessert", "Dessert", "#4E3320", [
    ["Brownie", 100, "Warm, fudgy chocolate brownie", ["veg", "star"]],
    ["Brownie + Ice Cream", 140, "Warm brownie, vanilla scoop", ["veg", "star"]],
    ["Vanilla Cake", 50, "Soft vanilla tea cake", ["veg"]],
    ["Chocolate Cake", 50, "Moist chocolate tea cake", ["veg"]],
    ["Black Forest Cake", 50, "Cherry & cream tea cake", ["veg"]],
    ["Strawberry Cake", 50, "Strawberry cream tea cake", ["veg"]],
    ["Pista Cake", 50, "Pistachio tea cake", ["veg"]],
    ["Blueberry Cake", 50, "Blueberry tea cake", ["veg"]],
  ]],
];

const categories = MENU.map(([id, label], i) => ({ id, label, order: i }));

const menu = [];
MENU.forEach(([catId, , accent, items]) => {
  items.forEach(([name, price, blurb, tags = []]) => {
    menu.push({
      id: slug(name),
      cat: catId,
      name,
      tamil: "",
      price,
      blurb,
      accent,
      tags,
      // The printed menu carries no recipes. Left blank on purpose —
      // the owner fills these in from /admin/menu.
      time: "",
      serves: "",
      level: "",
      ingredients: [],
      steps: [],
      note: "",
    });
  });
});

const HOURS = [
  "Monday", "Tuesday", "Wednesday", "Thursday",
  "Friday", "Saturday", "Sunday",
].map((day) => ({ day, time: "6:00 am – 10:00 pm" }));

const data = {
  cafe: {
    name: "Kapi Coast",
    tamil: "காபி கோஸ்ட்",
    tagline: "Café & snacks · coastal flavours",
    phone: "+91 73822 19403",
    whatsapp: "917382219403",
    email: "",
    addressLines: [
      "105, OMR Road, Kazhipattur Village",
      "Vaniyanchavadi, Kalipattur",
      "Chennai, Tamil Nadu 603103",
    ],
    mapsQuery:
      "105, OMR Rd, Kazhipattur Village, Vaniyanchavadi, Kalipattur, Chennai, Tamil Nadu 603103",
    hours: HOURS,
  },
  categories,
  menu,
  // The journal posts written during the design draft asserted things about the
  // business that aren't on the menu card, so none are seeded. Add real ones
  // from /admin/journal.
  posts: [],
  // The menu card advertises "CUSTOM CAKES TO ORDER" with a phone number and
  // nothing else — no flavours, sizes, finishes or prices. Nothing is seeded
  // here rather than invent options the cafe may not offer. Add real ones from
  // /admin/cakes.
  cake: {
    flavours: [],
    sizes: [],
    finishes: [],
    occasions: [],
    addons: [],
    packages: [],
  },
};

const out = path.join(path.dirname(fileURLToPath(import.meta.url)), "seed-data.json");
writeFileSync(out, JSON.stringify(data, null, 1));
console.log(
  `categories ${categories.length} · dishes ${menu.length} · posts ${data.posts.length} · cake flavours ${data.cake.flavours.length}`
);
