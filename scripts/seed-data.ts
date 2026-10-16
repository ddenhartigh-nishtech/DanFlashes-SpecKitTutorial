/**
 * Demo catalog fixture and demo shopper — development/demo data only, loaded by `npm run db:reset`
 * (or `db:seed` / `db:seed-demo`). The database is the runtime source of truth; edit live data in
 * Drizzle Studio, not here.
 */
import type { DemoShopper } from "@/lib/data/demo-shopper";
import type { CatalogFixture } from "@/lib/data/seed";

/** The demo shopper that `db:reset` (and `db:seed-demo`) create for local development. */
export const DEMO_SHOPPER: DemoShopper = {
  email: "demo@danflashes.local",
  password: "password123",
  displayName: "Demo Dan",
  creditUsd: "10000.00",
  pastOrder: { slug: "fractal-fury", size: "XL" },
  perDiem: { amountUsd: "75.00" },
};

export const SEED: CatalogFixture = {
  settings: {
    msrp: { startPriceUsd: "300.00", anchorScore: 10, doublingInterval: 10 },
    checkoutGate: true,
    blandShaming: true,
    confirmshaming: true,
    perDiemDrain: true,
    drainJokes: true,
    fakeScarcity: true,
    countdownTimers: true,
    socialProof: true,
    preCheckedAddOns: true,
    roachMotel: true,
    flashMode: true,
    pipesBackground: true,
    flashCreditPresetsUsd: ["500.00", "1000.00", "5000.00"],
    mediaBaseUrl: "",
  },

  placeholder: {
    key: "placeholder.svg",
    alt: "Diagonal neon stripes behind the words: image too complicated to load",
  },

  tiers: [
    {
      name: "BLAND",
      tagline: "You sure about that?",
      minScore: 0,
      badgeBgColor: "#C8B89A",
      badgeTextColor: "#3B3B3B",
    },
    {
      name: "Complicated",
      tagline: "A respectable amount going on.",
      minScore: 10,
      badgeBgColor: "#FF2D95",
      badgeTextColor: "#FFFFFF",
    },
    {
      name: "Very Complicated",
      tagline: "People will ask about it.",
      minScore: 25,
      badgeBgColor: "#00E5FF",
      badgeTextColor: "#000000",
    },
    {
      name: "Seriously Complicated",
      tagline: "Your coworkers will need a minute.",
      minScore: 45,
      badgeBgColor: "#FFE600",
      badgeTextColor: "#000000",
    },
    {
      name: "Dangerously Complicated",
      tagline: "Do not operate heavy machinery.",
      minScore: 70,
      badgeBgColor: "#FF5A00",
      badgeTextColor: "#000000",
    },
    {
      name: "Too Complicated for Most Men",
      tagline: "Most men couldn't handle this.",
      minScore: 100,
      badgeBgColor: "#7A00FF",
      badgeTextColor: "#FFE600",
    },
  ],

  addOns: [
    {
      name: "Pattern Protection Plan™",
      pitch: "Every shape covered. Even the small ones.",
      declineLine: "No thanks, I'd rather my patterns go unprotected.",
      priceUsd: "49.99",
      position: 1,
    },
    {
      name: "Complexity Insurance",
      pitch: "If it ever gets simpler, we make it right.",
      declineLine: "No thanks, I'll take my chances with complexity.",
      priceUsd: "89.99",
      position: 2,
    },
    {
      name: "Extended Vibrancy Warranty",
      pitch: "Fading is for other shirts.",
      declineLine: "No thanks, I like my colors fading.",
      priceUsd: "29.99",
      position: 3,
    },
    {
      name: "Priority Compliments Package",
      pitch: "Strangers notice first. Guaranteed.",
      declineLine: "No thanks, I'll wait my turn to be noticed.",
      priceUsd: "19.99",
      position: 4,
    },
  ],
  shirts: [
    // ── BLAND ──
    {
      slug: "beige-regret",
      name: "Beige Regret",
      style: "polo",
      complexity: 2,
      description:
        "One color. Zero patterns. For the man who has stopped trying. We keep it in stock as a warning.",
      image: {
        key: "shirts/beige-regret.svg",
        alt: "A plain beige polo with two faint grey smudges",
      },
    },
    {
      slug: "khaki-commitment",
      name: "Khaki Commitment",
      style: "button-down",
      complexity: 6,
      description:
        "Technically a shirt. Pairs with a lanyard and a firm belief that nobody is looking at you.",
      image: {
        key: "shirts/khaki-commitment.svg",
        alt: "A khaki button-down with a few muted tan shapes",
      },
    },
    // ── Complicated ──
    {
      slug: "geo-riot",
      name: "Geo Riot",
      style: "polo",
      complexity: 12,
      description: "Triangles fighting circles fighting rectangles. Nobody wins. You win.",
      image: {
        key: "shirts/geo-riot.svg",
        alt: "A polo covered in clashing pink, cyan, and yellow triangles and circles",
      },
    },
    {
      slug: "paisley-panic",
      name: "Paisley Panic",
      style: "button-down",
      complexity: 18,
      description:
        "Paisley that knows something you don't. Wear it to the quarterly review and watch the room recalibrate.",
      image: {
        key: "shirts/paisley-panic.svg",
        alt: "A button-down with swirling neon teardrop shapes over squiggles",
      },
    },
    {
      slug: "hawaiian-tax-return",
      name: "Hawaiian Tax Return",
      style: "button-down",
      complexity: 22,
      finalPriceUsd: "1040.00",
      description: "Tropical, itemized, and deductible in your heart. Priced by Dan personally.",
      image: {
        key: "shirts/hawaiian-tax-return.svg",
        alt: "A button-down packed with zigzags and ovals in lime, orange, and violet",
      },
    },
    // ── Very Complicated ──
    {
      slug: "zigzag-zealot",
      name: "Zigzag Zealot",
      style: "polo",
      complexity: 28,
      description:
        "Every zig answered by a zag. Two layers of pattern, because one layer is for people who rent.",
      image: {
        key: "shirts/zigzag-zealot.svg",
        alt: "A polo layered with zigzag lines over scattered neon shapes",
      },
    },
    {
      slug: "tc-tugger-belly-breather",
      name: "T.C. Tugger Belly Breather",
      style: "button-down",
      complexity: 34,
      description:
        "A T.C. Tugger's collaboration. Built-in tug zone keeps the fabric off the gut when the meeting goes quiet. Tug it. Tug it again.",
      image: {
        key: "shirts/tc-tugger-belly-breather.svg",
        alt: "A roomy button-down with orange zigzags over teal swirls",
      },
    },
    {
      slug: "mall-kiosk-majesty",
      name: "Mall Kiosk Majesty",
      style: "polo",
      complexity: 40,
      description:
        "Spotted from the far end of the food court. Then spotted again, because people go back to look.",
      image: {
        key: "shirts/mall-kiosk-majesty.svg",
        alt: "A polo dense with overlapping neon rectangles, rings, and waves",
      },
    },
    // ── Seriously Complicated ──
    {
      slug: "fractal-fury",
      name: "Fractal Fury",
      style: "button-down",
      complexity: 52,
      description: "Patterns inside patterns inside a man who finally gets it.",
      image: {
        key: "shirts/fractal-fury.svg",
        alt: "A button-down with three dense layers of small neon shapes",
      },
    },
    {
      slug: "confetti-cannon",
      name: "Confetti Cannon",
      style: "polo",
      complexity: 63,
      description: "A celebration you wear. The occasion is you.",
      image: {
        key: "shirts/confetti-cannon.svg",
        alt: "A polo exploding with hundreds of tiny multicolor shapes",
      },
    },
    // ── Dangerously Complicated ──
    {
      slug: "op-art-overdrive",
      name: "Op-Art Overdrive",
      style: "button-down",
      complexity: 77,
      description:
        "Staring at it for longer than four seconds is not recommended. Staring at you while you wear it is unavoidable.",
      image: {
        key: "shirts/op-art-overdrive.svg",
        alt: "A button-down overwhelmed by four layers of interlocking neon patterns",
      },
    },
    {
      slug: "kaleidoscope-custody-battle",
      name: "Kaleidoscope Custody Battle",
      style: "polo",
      complexity: 88,
      description: "Worth fighting for. Every weekend and alternating holidays.",
      image: {
        key: "shirts/kaleidoscope-custody-battle.svg",
        alt: "A polo with dense, layered kaleidoscopic neon shapes",
      },
    },
    // ── Too Complicated for Most Men ──
    {
      slug: "the-per-diem",
      name: "The Per Diem",
      style: "button-down",
      complexity: 104,
      description: "Costs exactly what you were going to spend on food this trip. Worth it.",
      image: {
        key: "shirts/the-per-diem.svg",
        alt: "A button-down buried under five layers of tiny, frantic neon shapes",
      },
    },
    {
      slug: "dans-masterpiece",
      name: "Dan's Masterpiece",
      style: "polo",
      complexity: 130,
      description: "Dan's personal favorite. He won't say why. He doesn't have to.",
      image: {
        key: "shirts/dans-masterpiece.svg",
        alt: "A polo so densely patterned the base color is no longer visible",
      },
    },
    // ── Retired (inactive) ──
    {
      slug: "last-seasons-swirl",
      name: "Last Season's Swirl",
      style: "polo",
      complexity: 30,
      status: "inactive",
      description: "Retired from the floor. Spoken of in hushed tones.",
      image: { key: "shirts/last-seasons-swirl.svg", alt: "A polo with looping neon swirls" },
    },
  ],
};
