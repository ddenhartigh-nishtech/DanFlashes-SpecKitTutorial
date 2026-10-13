/**
 * Every shopper-facing string, in the Dan Flashes voice (constitution I): loud, confident,
 * dead serious on the surface. The store never explains the joke.
 */
export const copy = {
  brand: {
    name: "Dan Flashes",
    tagline: "Complicated shirts. Complicated prices.",
  },
  nav: {
    home: "Home",
    shirts: "Shirts",
    cart: "Cart",
    account: "Account",
    signIn: "Sign in",
    menu: "Menu",
  },
  home: {
    headline: "These shirts are complicated.",
    subhead: "That's why they cost what they cost. You already knew that.",
    featuredHeading: "The most complicated thing you'll see today",
    cta: "See every shirt",
  },
  listing: {
    heading: "Every shirt. Every pattern. Every price.",
    empty: "Nothing that complicated. Yet. Loosen a filter.",
    filters: "Filters",
    tier: "How complicated",
    price: "Price",
    minPrice: "Min $",
    maxPrice: "Max $",
    style: "Style",
    anyStyle: "Any",
    sort: "Sort",
    apply: "Show me",
    reset: "Reset",
    sorts: {
      "complexity-desc": "Most Complicated",
      "complexity-asc": "Least Complicated",
      "price-desc": "Price: High to Higher",
      "price-asc": "Price: Low to High",
    },
    count: (n: number) => `${n} ${n === 1 ? "shirt" : "shirts"}`,
  },
  styles: { polo: "Polo", "button-down": "Button-down" },
  shirt: {
    retired: "Retired from the floor",
  },
  errors: {
    notFoundTitle: "This page isn't complicated enough to exist.",
    notFoundBody: "Whatever you were looking for, there's a better shirt for it.",
    notFoundCta: "Back to the shirts",
    serverTitle: "Something got too complicated.",
    serverBody: "Even we have limits. Not many. But this was one.",
    retry: "Try again",
    teapotTitle: "418: I'm a teapot.",
    teapotBody:
      "Dan Flashes does not sell teapots. Dan Flashes sells complicated shirts. The teapot is fine. You are not wearing one.",
    teapotCta: "Go buy a shirt",
  },
  footer: "All sales final. All shirts complicated.",
} as const;
