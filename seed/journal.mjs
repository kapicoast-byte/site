/**
 * Opening set of journal posts.
 *
 * Written to be useful and safe to publish on day one: they explain technique,
 * the menu, and how ordering actually works. Every process claim matches what
 * the Terms page already says (a cake enquiry is an estimate, a day's notice,
 * no payment through the site, shared kitchen and allergens).
 *
 * Deliberately NOT here: founding dates, staff names, suppliers, estates,
 * awards, or anything about the cafe's history. None of that is knowable from
 * the menu, and a blog is the worst place to guess. Add those yourself from
 * Admin -> Journal.
 */

const p = (c) => ({ t: "p", c });
const h = (c) => ({ t: "h", c });
const q = (c) => ({ t: "q", c });
const ul = (...c) => ({ t: "ul", c });

export const POSTS = [
  {
    slug: "how-to-order-a-cake",
    title: "How to order a cake from us",
    category: "Cakes",
    excerpt:
      "What to tell us, how much notice we need, and what happens after you send the enquiry.",
    readMins: 4,
    body: [
      p("The cake page on this site does one job: it helps you describe what you want and gives you a rough price before you speak to anyone. Here is what happens on our side, and what we need from you."),

      h("Start with the four things we always ask"),
      p("Whatever else changes, an order needs these before we can quote properly:"),
      ul(
        "The date, and roughly what time you want to collect it.",
        "How many people it needs to feed — this decides the size more reliably than inches do.",
        "Flavour, and whether anyone eating it avoids egg.",
        "What should be written on it, spelled exactly as you want it piped.",
      ),
      p("The last one causes more trouble than the rest put together. Send us the name in writing rather than over the phone. Spellings do not survive a noisy counter."),

      h("Give us a day. Give us more if it is elaborate"),
      p("A day's notice covers a plain cake in a standard size. A tiered cake, a photo print, a sculpted design or a large order for an office needs longer, and during festival weeks the whole calendar fills earlier than you would expect."),
      p("If you are planning around a fixed date — a birthday, an anniversary, a farewell at work — the safest thing you can do is ask early, even before you have decided the design. We can hold the date and settle the details later."),

      h("The estimate is not the order"),
      p("The price the builder shows you is an estimate. Sending it does not reserve anything and does not put a cake in the oven."),
      q("An order is confirmed only when we have replied and agreed the details with you."),
      p("Until then nothing is booked. If we cannot take it — because of the date, the design, or how busy we are — we will tell you as soon as we can rather than leave you waiting."),

      h("Paying"),
      p("No payment is taken through this website. There is no card form and no online checkout. Payment happens at the counter, or by whatever method we agree when the order is confirmed."),

      h("Changing or cancelling"),
      p("Tell us as early as you can. Before we start baking, changes are easy. Once a cake has been made to your design it cannot be sold to anyone else, so a late cancellation may still be charged."),

      h("Collecting it"),
      p("Come a little before you need it rather than exactly on time — Chennai traffic is the most common reason a cake arrives late to its own party. Carry it flat, not on a lap, and keep it out of the sun. Buttercream and fresh cream both soften quickly here."),
      p("If the cake is going straight to an evening event, tell us. We will keep it chilled until you collect rather than have it sit out."),
    ],
  },

  {
    slug: "what-makes-filter-coffee",
    title: "What makes filter coffee filter coffee",
    category: "Coffee",
    excerpt:
      "Decoction, chicory, and why it gets poured back and forth between two steel vessels.",
    readMins: 5,
    body: [
      p("South Indian filter coffee is not a brewing shortcut or a lesser espresso. It is its own method, and almost everything that makes it taste the way it does happens before the milk goes anywhere near it."),

      h("It is a drip, not a press"),
      p("The steel filter is two stacked chambers. Coffee goes in the upper one, gets levelled with a perforated pressing disc, and hot water is poured over the top. Then you leave it. Gravity pulls the water through the grounds slowly, and what collects in the lower chamber is decoction — thick, dark, and far stronger than anything you would drink neat."),
      p("The waiting is not optional. Rushing water through the grounds gives you something weak and slightly sour. A filter that takes fifteen or twenty minutes to drip is a filter working correctly."),

      h("Do not pack it down"),
      p("The commonest mistake at home is pressing the coffee hard into the upper chamber, the way you would tamp an espresso. This is the opposite of what a gravity filter wants. Packed grounds either stall completely or force the water to channel through one narrow path, and the decoction comes out both weak and bitter. Level it and leave it loose."),

      h("Chicory is the point, not a compromise"),
      p("Most South Indian filter coffee is a blend of coffee and roasted chicory root, often somewhere near 70:30. Chicory is frequently described as an adulterant or a cheap filler, and that has never really been fair."),
      q("Chicory adds body, a dark bitterness, and the slight caramel edge people recognise as tasting like filter coffee."),
      p("A pure coffee decoction is a fine drink, but it is a different one. If a filter coffee tastes thin to you, the blend is usually the reason before the technique is."),

      h("Fresh decoction, or none"),
      p("Decoction goes stale faster than people expect. Within a couple of hours it turns flat and takes on a harsh, ashy bitterness that no amount of milk or sugar covers. Coffee made from morning decoction at four in the afternoon is a genuinely different and worse drink."),
      p("This is why a filter coffee at a busy counter is often better than one made carefully at home — not because of skill, but because the decoction is never more than a little while old."),

      h("Why it gets pulled"),
      p("The pour back and forth between the tumbler and the davara, from a height, is not showmanship. It does three things at once: it mixes the decoction and milk evenly, it drops the temperature from scalding to drinkable, and it whips air in to build the layer of froth on top."),
      p("Skip it and you get the same ingredients as a noticeably flatter drink. It is the last step and it is doing real work."),

      h("If you are making it at home"),
      ul(
        "Buy the coffee ground for a filter — coarse. Espresso grind will choke it.",
        "Use water just off the boil, not boiling hard.",
        "Full-fat milk, boiled, not merely warmed.",
        "Add the sugar to the decoction before the milk. It dissolves properly that way.",
      ),
    ],
  },

  {
    slug: "kadak-chai-what-the-word-means",
    title: "Kadak chai, and what the word is doing",
    category: "Chai",
    excerpt:
      "Strong is not the same as bitter. What the boiling is for, and why the masala gets crushed fresh.",
    readMins: 4,
    body: [
      p("Ask for kadak chai and you are asking for something specific — strong, dark, with body to it. What you are not asking for is bitterness, and the two get confused constantly."),

      h("Dust, not leaf"),
      p("Milk tea is made with CTC — crush, tear, curl — usually the finest grade, the dust. Whole leaf is the wrong tool here. Its flavour is delicate and it gets buried under milk and sugar without trace. CTC dust gives up colour and strength fast and hard, which is exactly what a chai needs and exactly why the same tea would taste harsh brewed on its own."),

      h("Let it rise more than once"),
      p("The characteristic method is to bring the pan to a rolling boil, pull it off as it climbs, let it settle, and put it back. Two or three times."),
      p("Each rise pushes more out of the tea and thickens the milk slightly as some water goes off as steam. That is where the body comes from. One long flat simmer does not do the same thing — it just cooks the milk."),
      q("Strong comes from repeated boiling. Bitter comes from boiling too long in one go."),

      h("Ginger goes in the water, never the milk"),
      p("Crushed ginger is acidic enough to curdle milk if it goes in late or the heat is high. Boil it in the water first, with the tea, and add the milk afterwards. Bruise the ginger rather than slicing it — you want the juice out, and a clean slice keeps most of it inside."),

      h("Crush the masala the same day"),
      p("Cardamom, clove, a little cinnamon, sometimes pepper or fennel. The volatile oils that make them worth adding start disappearing the moment they are ground. A masala powder that has sat in a jar for a week smells of the jar."),
      p("Crushing a small amount fresh each morning is more work and it is the single biggest difference between an ordinary masala chai and one worth going back for."),

      h("Sugar early"),
      p("Sugar added while the chai is still boiling dissolves completely and rounds the whole drink. Sugar stirred into the finished cup sits at the bottom and makes the first sip and the last sip two different drinks."),
    ],
  },

  {
    slug: "bajji-bonda-vada-pakoda",
    title: "Bajji, bonda, vada, pakoda: which is which",
    category: "Snacks",
    excerpt:
      "Four fried things that are not interchangeable. A short guide to the evening counter.",
    readMins: 4,
    body: [
      p("They arrive on similar plates, they are all fried, and the names get used loosely. They are genuinely different things, and knowing which is which makes ordering much easier."),

      h("Bajji — something whole, dipped in batter"),
      p("Take a slice or a whole vegetable, coat it in seasoned gram flour batter, fry. The vegetable stays recognisable and stays the star: a long chilli, a plantain round, a potato slice, an onion ring."),
      p("A bajji is defined by what is inside the batter. Ask for a mirchi bajji and you are getting a chilli. The batter is a jacket, not the dish."),

      h("Bonda — a ball with a filling"),
      p("Round, and hollow in the sense that what is inside is cooked separately. A spiced potato and onion mixture is made first, rolled into a ball, dipped in the same kind of gram flour batter, and fried."),
      p("The difference from a bajji is that a bonda's centre was a dish in its own right before it went anywhere near the batter."),

      h("Vada — the batter is the dish"),
      p("No coating at all. A vada is ground dal, seasoned and shaped and fried directly."),
      ul(
        "Medhu vada: urad dal, ground light and airy, shaped with a hole through the middle. Soft inside, crisp at the edge.",
        "Masala vada: chana dal, ground coarse so it keeps its texture, with onion and curry leaf through it. Flatter and much crunchier.",
      ),
      p("The hole in a medhu vada is functional. It gives the middle a surface to cook from, so the centre is done by the time the outside is golden."),

      h("Pakoda — no shape at all"),
      p("Sliced onion tossed with just enough gram flour to hold, dropped into oil in rough clusters. Nothing is coated and nothing is shaped. Those irregular edges are the whole point — they are what goes brittle."),
      p("A pakoda made with too much water becomes a fritter, soft and heavy. Made almost dry, using only the water the salted onion releases, it shatters."),

      h("What to order with what"),
      p("Bajji and pakoda go with chai and are best eaten within a minute or two of leaving the oil. Vada belongs with sambar and chutney and is more forgiving. Bonda sits between the two."),
      p("If you want one thing with a filter coffee in the evening, ask what came out of the oil most recently and order that. It is a better question than which is best."),
    ],
  },

  {
    slug: "allergies-and-dietary-needs",
    title: "Eating here with an allergy or a dietary need",
    category: "Notes",
    excerpt: "What we can tell you honestly, and what we cannot promise.",
    readMins: 3,
    body: [
      p("This is worth being plain about rather than reassuring about, because being reassuring is how people get hurt."),

      h("Ours is a shared kitchen"),
      p("Dishes are prepared side by side, oil is shared between fried items, and the same surfaces and utensils are in use all day. That means we cannot guarantee any dish is free from a particular allergen, however carefully it is made."),
      p("If your reaction is severe, please take that seriously. We would far rather tell you honestly what we cannot promise than have you rely on a promise we cannot keep."),

      h("Tell us at the counter, before you order"),
      p("Ask before ordering rather than after. We can tell you what actually goes into a dish, what it is fried in, and what it sits next to. If we do not know, we will say so instead of guessing."),

      h("The descriptions on this site are a guide"),
      p("The blurb under each dish, and the recipes attached to them, describe how a dish is generally made. They are not a full ingredient list and not a substitute for asking. Recipes on this site are written to be useful, not to be a legal declaration of contents."),

      h("What the labels mean"),
      ul(
        "“Veg” describes the dish as prepared. It is a description, not a certification.",
        "Eggless is not a default. Several cakes and bakes contain egg unless we have agreed otherwise for your order.",
        "Nuts appear in more places than the name suggests — badam milk, garnishes, some cakes and cookies.",
      ),

      h("For cake orders"),
      p("An allergy or a dietary requirement is something to raise when you first enquire, not after the order is confirmed. It can change the flavour options, the finish and the price, and some combinations are not possible at all. Earlier is better."),

      h("If you are ever unsure"),
      p("Ask. Nobody at the counter will mind, and no question about what is in the food is a nuisance one."),
    ],
  },

  {
    slug: "ordering-for-a-group",
    title: "Ordering for a group without overthinking it",
    category: "Notes",
    excerpt:
      "Feeding a table of eight, an office floor, or a family that cannot agree on anything.",
    readMins: 3,
    body: [
      p("Ordering for one is easy. Ordering for a group is where people freeze at the counter with a queue behind them. A few rules of thumb make it quick."),

      h("Order in rounds, not all at once"),
      p("Fried snacks are best within minutes of leaving the oil. A single enormous order means the last plate is eaten fifteen minutes after the first and is a noticeably worse plate. Order a round, see what disappears fastest, order that again."),

      h("Get the drinks in first"),
      p("Coffee and chai come out faster than anything from the fryer. Sending the drinks order in immediately means nobody is sitting with empty hands while the food is made, and it spaces the whole thing out sensibly."),

      h("Cover three directions"),
      p("For a mixed group who cannot agree, the reliable spread is:"),
      ul(
        "Something fried and savoury — bajji, pakoda or samosa, to share from the middle.",
        "Something from tiffin — idly or vada, which suits people who want a proper plate rather than a snack.",
        "Something sweet — cookies or a tea cake, which travel well and settle arguments.",
      ),
      p("Chaat is the exception to sharing: pani puri and bhel are assembled to order and go soft quickly, so order those per person and eat them straight away."),

      h("For an office floor"),
      p("Tell us the headcount and roughly when you need it, and give us notice rather than calling on the day. Large fried orders in particular need planning — a fryer can only produce so much at once, and everything arriving lukewarm together helps nobody."),
      p("Cakes for an office go the same way as any other cake order: enquire early, confirm the details, collect a little before you need it."),

      h("One thing worth knowing"),
      p("If you are undecided, ask what has just come out. The best thing on the counter at any given moment is usually the freshest thing, not the fanciest one."),
    ],
  },
];
