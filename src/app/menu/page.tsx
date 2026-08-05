import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import Nav from "@/components/Nav";
import Valance from "@/components/Valance";
import Footer from "@/components/Footer";
import MenuBrowser, { type Dish, type Ingredient } from "@/components/MenuBrowser";
import MenuCurtain from "@/components/MenuCurtain";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Menu & Recipes — Kapi Coast",
  description:
    "The full Kapi Coast menu. Tap any dish to open the recipe: ingredients, method and the step that usually goes wrong.",
};

export default async function MenuPage() {
  const [s, categories, items] = await Promise.all([
    getSettings(),
    db.category.findMany({ orderBy: { order: "asc" } }),
    db.menuItem.findMany({
      where: { published: true },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      include: { category: true },
    }),
  ]);

  const dishes: Dish[] = items.map((m) => ({
    id: m.id,
    slug: m.slug,
    name: m.name,
    tamil: m.tamil,
    price: m.price,
    blurb: m.blurb,
    accent: m.accent,
    imageUrl: m.imageUrl,
    tags: m.tags,
    time: m.time,
    serves: m.serves,
    level: m.level,
    note: m.note,
    ingredients: (m.ingredients as unknown as Ingredient[]) ?? [],
    steps: (m.steps as unknown as string[]) ?? [],
    categorySlug: m.category.slug,
    categoryLabel: m.category.label,
  }));

  return (
    <>
      <MenuCurtain word="மெனு" />
      <Nav logoUrl={s.logoDarkUrl} tamilName={s.tamilName} />

      <main id="main">
        <section className="pagehead">
          <Valance />
          <div className="pagehead__ghost tamil" aria-hidden="true">மெனு</div>
          <div className="wrap">
            <p className="eyebrow">The full list</p>
            <h1 style={{ fontSize: "clamp(2.8rem,8vw,6rem)", marginTop: ".6rem" }}>
              Menu &amp;<br /><span className="gold">recipes.</span>
            </h1>
            <p className="lede" style={{ marginTop: "1.4rem" }}>
              Everything we serve, and how each dish is made. Tap one and the
              recipe opens. Prices are what you&apos;ll pay at the till.
            </p>
          </div>
        </section>

        <MenuBrowser
          dishes={dishes}
          categories={categories.map((c) => ({ slug: c.slug, label: c.label }))}
        />
      </main>

      <Footer s={s} />
    </>
  );
}
