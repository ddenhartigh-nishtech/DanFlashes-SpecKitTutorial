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
    shirts: "Shirts",
    cart: "Cart",
    account: "Account",
    about: "About",
    signIn: "Sign in",
    menu: "Menu",
    mainLabel: "Main",
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

  product: {
    size: "Pick your size",
    addToCart: "Add to cart",
    adding: "Adding…",
    added: "It's in the cart. Excellent decision.",
    enhance: "ENHANCE",
    zoomOut: "Zoom out",
    reset: "Reset",
    zoomHint: "Click, scroll, pinch, or hit ENHANCE. Count every shape.",
    viewCart: "View cart",
  },
  cart: {
    title: "Your cart",
    heading: "Your cart. Your choices. Your legacy.",
    quantity: "Qty",
    size: (size: string) => `Size ${size}`,
    lineDetail: (size: string, quantity: number, unit: string) =>
      `Size ${size} · ${quantity} × ${unit}`,
    update: "Update",
    subtotal: "Subtotal",
    checkout: "Check out",
    removedNotice: "Dan pulled these from the floor while you were away:",
    blandRemovedNotice: "Dan took these out of your cart. You'll thank him later:",
    emptyTitle: "You sure about that?",
    emptyBody:
      "An empty cart. On purpose? Here's the most complicated thing we could find for you.",
    emptyCta: "Show me the most complicated shirts",
  },
  checkout: {
    title: "Checkout",
    heading: "Almost yours.",
    shipping: "Shipping",
    tax: "Tax",
    total: "Total",
    payWith: "Pay with",
    card: "Credit card",
    flashCredit: "Flash Credit",
    flashBalance: (balance: string) => `Balance: ${balance}`,
    cardNumber: "Card number",
    expiry: "Expiry (MM/YY)",
    expiryPlaceholder: "MM/YY",
    cvc: "CVC",
    place: "Place order",
    placing: "Processing your excellent decision…",
    priceChanged: (total: string) =>
      `Dan adjusted a price. Your new total is ${total}. Check it, then place the order again.`,
    topUpLink: "Top up Flash Credit",
    streamsLink: "connect a revenue stream",
    useCard: "or pay by card",
    // Split payment (003 US3)
    applyCredit: (available: string) => `Apply my Flash Credit (${available} available)`,
    removeCredit: "Remove Flash Credit",
    creditLine: (amount: string) => `Flash Credit: −${amount}`,
    cardLine: (amount: string) => `On your card: ${amount}`,
    coveredByCredit: "Flash Credit covers the whole thing. No card needed. Look at you.",
    confirmSplit: (cardAmount: string) => `Put the remaining ${cardAmount} on my card`,
    noCredit: "You have $0.00 of Flash Credit.",
    creditChanged: (credit: string, card: string) =>
      `Your Flash Credit changed. It now covers ${credit}, leaving ${card} for your card. Confirm and place it again.`,
    signedInAs: (who: string) => `Checking out as ${who}`,
  },
  order: {
    title: (number: string) => `Order ${number}`,
    heading: "You did it.",
    body: "Your shirts are complicated, your decision was not. Dan is proud of you.",
    paidCard: (brand: string, last4: string) => `Charged to ${brand} ending ${last4}`,
    paidFlash: "Paid with Flash Credit",
    paidSplit: (credit: string, brand: string, last4: string, card: string) =>
      `${credit} in Flash Credit, ${card} charged to ${brand} ending ${last4}`,
    keepShopping: "Keep shopping",
    viewAccount: "See all your orders",
  },
  auth: {
    signInTitle: "Sign in",
    signUpTitle: "Create an account",
    signInHeading: "Welcome back. The shirts missed you.",
    signUpHeading: "Join the most complicated men in the room.",
    gate: "Only members can check out. Membership is a privilege. You've earned it — sign in or sign up.",
    email: "Email",
    password: "Password",
    passwordHint: "At least 8 characters. Make it complicated.",
    displayName: "What should Dan call you?",
    signIn: "Sign in",
    signUp: "Sign up",
    working: "One moment…",
    toSignUp: "New here? Create an account",
    toSignIn: "Already a member? Sign in",
  },
  account: {
    title: "Account",
    heading: (name: string) => `Looking complicated, ${name}.`,
    ordersHeading: "Purchase history",
    noOrders: "No orders yet. That's a problem we can fix together.",
    placedOn: (date: string) => `Placed ${date}`,
    flashHeading: "Flash Credit",
    balance: "Balance",
    topUpHeading: "Load up",
    customAmount: "Or enter an amount",
    topUp: "Add Flash Credit",
    toppingUp: "Loading…",
    toppedUp: "Flash Credit loaded. Go spend it.",
    history: "Credit history",
    noEntries: "No Flash Credit yet. Load up below.",
    entryTopUp: (brand: string, last4: string) => `Top-up from ${brand} ending ${last4}`,
    entrySpend: (order: string) => `Spent on order ${order}`,
  },

  /** Dan, in his own words (002 US3). Editing the bio is a code change, on purpose. */
  about: {
    title: "About Dan",
    heading: "Hi. I'm Dan. You know the shirts.",
    sections: [
      {
        heading: "Who I am",
        body: [
          'People ask me, "Dan, how did you become the most important man in shirts?" Nobody has actually asked me that. But if they did, I\'d tell them this:',
          "I looked at a plain shirt once and I felt sick. Physically sick. I had to sit down in the food court. That's the day I knew the world needed more going on.",
        ],
      },
      {
        heading: "My method: more",
        body: [
          "Every Dan Flashes shirt starts as a regular shirt. Then I add a pattern. Then I add a pattern to the pattern. I don't stop until the man standing next to it gets a little dizzy. That's how I know it's ready.",
          "My team counts every shape. Every triangle. Every squiggle. Every little guy. Each one is a decision, and decisions aren't free.",
        ],
      },
      {
        heading: "About the prices",
        body: [
          'Some guys see a polo for twelve hundred dollars and say "that\'s insane." Those guys are wearing beige.',
          "Here's the math. Complicated patterns take complicated minds, and complicated minds do not come cheap. You're not paying for a shirt. You're paying for the look on Doug's face at the quarterly kickoff.",
          "Honestly? At these prices I'm losing money. I'm practically paying you to look this good.",
        ],
      },
    ],
    exhibitA: {
      heading: "Exhibit A",
      intro:
        "Still not convinced? Look at this and tell me it's too much. You can't. It's exactly enough.",
    },
  },

  /** Revenue streams (003 US1): money that finds its way to shirts on its own. */
  streams: {
    heading: "Revenue Streams",
    intro:
      "Connect where the money comes from. It goes straight into Flash Credit. You're welcome.",
    empty: "No revenue streams yet. Money is out there right now, not becoming shirts.",
    presets: {
      per_diem: "Per Diem",
      expense_report: "Expense Report Padding",
      college_fund: "My Kid's College Fund",
      garage_sale: "Garage Sale",
      second_mortgage: "Second Mortgage",
    },
    customOption: "Something else…",
    schedules: {
      recurring: "Recurring top-off",
      one_time: "Just once",
      whenever: "Whenever I want",
    },
    /** What each schedule actually does, so a recurring top-off and "whenever" can't be confused. */
    hints: {
      recurring:
        "Tops off on its own, on the interval you set. The first top-off sets the day and time it repeats.",
      one_time: "Applied once, right now. That's it.",
      whenever: "Pays each time you hit Cash in. Never on its own.",
    },
    /** An interval in words: "5 minutes", "hour", "2 days", "2 weeks". */
    period: (minutes: number) => {
      const [n, unit] =
        minutes % 10080 === 0
          ? [minutes / 10080, "week"]
          : minutes % 1440 === 0
            ? [minutes / 1440, "day"]
            : minutes % 60 === 0
              ? [minutes / 60, "hour"]
              : [minutes, "minute"];
      return n === 1 ? unit : `${n} ${unit}s`;
    },
    every: (minutes: number) => `every ${copy.streams.period(minutes)}`,
    units: { minutes: "minutes", hours: "hours", days: "days", weeks: "weeks" },
    form: {
      heading: "Connect a stream",
      source: "Where's it coming from?",
      customName: "What do you call it?",
      amount: "How much each time",
      schedule: "When does it pay?",
      interval: "Tops off every",
      intervalCount: "How many",
      intervalUnit: "Minutes, hours, days or weeks",
      intervalExample:
        "Paycheck? Every 2 weeks, starting a Friday at 5:00 PM. Per diem? Every 1 day, starting at 8:00 AM.",
      startsNow: "Starts now",
      startsAt: "Starts",
      ongoing: "Ongoing (it never stops)",
      endsAt: "Ends",
      connect: "Connect it",
      connecting: "Connecting…",
      apply: "Apply it",
      applying: "Applying…",
    },
    nextPayment: "Next payday",
    windowFrom: "From",
    windowUntil: "until",
    windowForever: "and it never stops",
    startsLater: "Not yet. It starts",
    cashIn: "Cash in",
    cashingIn: "Cashing in…",
    done: "Paid in full",
    endedBadge: "Over",
    disconnectedBadge: "Disconnected",
    connected: "Connected. The money is already on its way to shirts.",
    applied: "Applied. It's already in your Flash Credit.",
    cashedIn: "Cashed in. Straight to Flash Credit.",
    disconnected: "Disconnected. Bold move.",
    historyEntry: (name: string) => `${name}: payday`,
    /** What's left of a stream once his orders have spent it, per diem first (003 US4). */
    left: (amount: string) => `Left: ${amount}`,
    gone: "GONE",
  },

  /** The per diem drain (003 US2): a gauge that only ever goes one way, and a party at $0. */
  meter: {
    label: "Per diem left",
    drained: "Per diem: GONE",
    drainedTag: "Achievement unlocked",
    /** The (x) on a GONE pop (owner, round 4). */
    dismiss: (trophy: string) => `Put away "${trophy}". Dan will still know.`,
    dismissed: "Put away. It still happened.",
  },
  /** The urgency engine (004): every sales trick, played straight. */
  urgency: {
    scarce: "Only 1 left!",
    again: "Just kidding, we actually found another one! One more left!",
    plenty: "Plenty left. Nobody wants these.",
    foundAnother: "Oh wait, we found another one!",
    deal: "This price won't last.",
    hold: "Your shirts are reserved for",
    looking: (n: number) => `${n} people are looking at this shirt right now.`,
    nobodyLooking: "0 people are looking at this shirt right now.",
    boughtThis: (name: string, department: string) =>
      `${name} from ${department} just bought this pattern.`,
    bought: (name: string, department: string) => `${name} from ${department} just bought`,
    dismissPop: "Close it. Everyone's still buying.",
    /** The people in his office who are buying everything (fake, every one of them). */
    cast: [
      { name: "Gary", department: "Accounts Payable" },
      { name: "Craig", department: "Regional Sales" },
      { name: "Todd", department: "IT" },
      { name: "Brent", department: "Compliance" },
      { name: "Doug", department: "Facilities" },
      { name: "Rick", department: "Middle Management" },
      { name: "Kyle", department: "Loss Prevention" },
      { name: "Phil", department: "Corporate Travel" },
      { name: "Dale", department: "Logistics" },
      { name: "Mitch", department: "the Fourth Floor" },
    ],
  },

  /** Drain them all (003 US4): every stream that runs dry is its own trophy in the corner. */
  achievements: {
    gone: (name: string) => `${name}: GONE`,
    /** What he did, on each GONE while `drain_jokes` is on (owner, round 6). */
    lines: {
      per_diem: "You spent your entire per diem on shirts.",
      expense_report: "You spent your padded expense report on shirts.",
      college_fund: "You spent your kid's college fund on shirts.",
      garage_sale: "You spent your garage sale money on shirts.",
      second_mortgage: "You spent your second mortgage on shirts.",
    },
    custom: (name: string) => `You spent "${name}" on shirts.`,
  },

  shame: {
    title: "You sure about that?",
    /** At least 8 (spec Assumptions). Rotated without repeats until the pool is used up. */
    lines: [
      "Beige is what a man wears when he's stopped trying. Is that you? It's starting to look like that's you.",
      "Guys who wear this have a lanyard for their lanyard.",
      "This shirt has never been invited to a party. Not once.",
      "You'd look like the guy who explains the printer to people.",
      "Nobody has ever pointed at a shirt like this from the far end of the food court.",
      "Men who wear this order the plain bagel and call it a treat.",
      "That's a shirt for a man who claps when the plane lands.",
      "There's nothing going on here. At all. You can see that, right?",
      "Picture walking into the conference and nobody says a word. That's this shirt.",
      "This is what the guy who reads the terms and conditions wears to the beach.",
    ],
    pitch: "Here's a shirt with something going on:",
    takeIt: "Okay. Show me the complicated one",
    nothingBetter: "Show me something complicated",
    relent: "Fine. I'll look at real shirts",
    /** Confirmshaming (constitution IV): shamed while the switch is on, neutral while it is off. */
    labels: {
      insist: { shamed: "Yes, I'd rather blend in", neutral: "Yes, I'm sure" },
      remove: { shamed: "Remove (and lose your edge)", neutral: "Remove" },
      signOut: { shamed: "Sign out (go back to being normal)", neutral: "Sign out" },
      disconnect: { shamed: "Disconnect (and settle for less)", neutral: "Disconnect" },
    },
  },

  /** One message per error code in contracts/actions.md. */
  codes: {
    SIZE_REQUIRED: "Pick a size. Even complicated men have measurements.",
    SHIRT_NOT_FOUND: "That shirt doesn't exist. Yet.",
    SHIRT_INACTIVE: "That shirt has been retired from the floor.",
    NOT_IN_CART: "That's not in your cart anymore.",
    INVALID_QUANTITY: "Quantity must be between 0 and 99. We checked.",
    BLAND_REFUSED: "Dan Flashes does not sell boring shirts. Not to you. Not to anyone.",
    INVALID_EMAIL: "That doesn't look like an email address.",
    WEAK_PASSWORD: "Your password needs at least 8 characters. Make it complicated.",
    EMAIL_TAKEN: "There's already an account with that email. Sign in instead.",
    BAD_CREDENTIALS: "That email and password don't match. Try again.",
    SIGN_IN_REQUIRED: "Sign in first.",
    GATE_SIGN_IN_REQUIRED: "Only members can check out. Sign in or sign up.",
    CART_EMPTY: "Your cart is empty. You sure about that?",
    CART_AUDITED: "Dan pulled some shirts from your cart. Review it and try again.",
    PRICE_CHANGED: "A price changed. Review your new total and place the order again.",
    CARD_INVALID_NUMBER: "That card number doesn't check out.",
    CARD_EXPIRED: "That card has expired. Dan doesn't accept the past.",
    CARD_INVALID_CVC: "The CVC should be 3 or 4 digits.",
    SPLIT_CONFIRMATION_REQUIRED: "Confirm putting the rest on your card first.",
    CREDIT_CHANGED: "Your Flash Credit changed. Check the new split and place the order again.",
    INVALID_AMOUNT: "Enter an amount of at least $0.01, in dollars and cents.",
    INVALID_STREAM_NAME: "Pick where it's coming from, or give it a name (40 characters, tops).",
    INVALID_STREAM_AMOUNT:
      "Each payment has to be at least $0.01, in dollars and cents. There's no upper limit. Dream big.",
    INVALID_INTERVAL: "How often? A whole number of minutes, hours, days or weeks, 1 to 1,000.",
    INVALID_WINDOW:
      "That timing doesn't work. Start now or later, and end after it starts. Or let it run forever.",
    PER_DIEM_EXISTS: "You already have a per diem running. One at a time. Spend it first.",
    STREAM_NOT_FOUND: "That stream isn't yours, or it's already gone.",
    NOT_CASHABLE: "Nothing to cash in there right now.",
  },
} as const;

export type ErrorCode = keyof typeof copy.codes;
