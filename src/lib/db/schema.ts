/**
 * Database schema — exactly per specs/001-core-storefront/data-model.md.
 *
 * Money columns (`*_usd`) are TEXT holding exact two-decimal USD ("200.18"), guarded by a CHECK
 * constraint and handled only through src/lib/money.ts. Timestamps are ISO-8601 UTC text.
 */
import { sql, type SQL } from "drizzle-orm";
import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";

const nowIso = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;

/** SQLite has no regex: build "^-?\d+\.\d{2}$" from GLOB + structural checks. */
function money(column: AnySQLiteColumn): SQL {
  return sql`(
    ${column} NOT GLOB '*[^0-9.-]*'
    AND ${column} GLOB '*.[0-9][0-9]'
    AND (${column} GLOB '[0-9]*' OR ${column} GLOB '-[0-9]*')
    AND length(${column}) - length(replace(${column}, '.', '')) = 1
    AND instr(substr(${column}, 2), '-') = 0
  )`;
}

const timestamps = {
  createdAt: text("created_at").notNull().default(nowIso),
};

// ── Catalog (owner-managed) ──────────────────────────────────────────────────────────────

export const media = sqliteTable(
  "media",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    key: text("key").notNull().unique(),
    alt: text("alt").notNull(),
    kind: text("kind", { enum: ["shirt", "placeholder"] }).notNull(),
    ...timestamps,
  },
  (t) => [
    check("media_kind", sql`${t.kind} IN ('shirt', 'placeholder')`),
    check("media_alt_length", sql`length(${t.alt}) BETWEEN 1 AND 200`),
    check(
      "media_key_relative",
      sql`${t.key} NOT GLOB '/*' AND ${t.key} NOT LIKE '%..%' AND ${t.key} NOT GLOB '[A-Za-z]:*' AND instr(${t.key}, '\\') = 0`,
    ),
  ],
);

export const shirts = sqliteTable(
  "shirts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    style: text("style", { enum: ["polo", "button-down"] }).notNull(),
    complexity: integer("complexity").notNull(),
    finalPriceUsd: text("final_price_usd"),
    description: text("description").notNull(),
    status: text("status", { enum: ["active", "inactive"] })
      .notNull()
      .default("active"),
    featured: integer("featured", { mode: "boolean" }).notNull().default(false),
    ...timestamps,
    updatedAt: text("updated_at").notNull().default(nowIso),
  },
  (t) => [
    check("shirts_slug", sql`${t.slug} <> '' AND ${t.slug} NOT GLOB '*[^a-z0-9-]*'`),
    check("shirts_name_length", sql`length(${t.name}) BETWEEN 1 AND 80`),
    check("shirts_style", sql`${t.style} IN ('polo', 'button-down')`),
    check("shirts_complexity", sql`${t.complexity} >= 0`),
    check("shirts_status", sql`${t.status} IN ('active', 'inactive')`),
    check("shirts_final_price", sql`${t.finalPriceUsd} IS NULL OR ${money(t.finalPriceUsd)}`),
    index("shirts_status_idx").on(t.status),
  ],
);

export const shirtImages = sqliteTable(
  "shirt_images",
  {
    shirtId: integer("shirt_id")
      .notNull()
      .references(() => shirts.id, { onDelete: "cascade" }),
    mediaId: integer("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "restrict" }),
    position: integer("position").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.shirtId, t.position] }),
    check("shirt_images_position", sql`${t.position} >= 0`),
  ],
);

export const complexityTiers = sqliteTable(
  "complexity_tiers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull().unique(),
    tagline: text("tagline"),
    minScore: integer("min_score").notNull().unique(),
    badgeBgColor: text("badge_bg_color").notNull(),
    badgeTextColor: text("badge_text_color").notNull(),
  },
  (t) => [
    check("tiers_min_score", sql`${t.minScore} >= 0`),
    check(
      "tiers_colors",
      sql`length(${t.badgeBgColor}) = 7 AND ${t.badgeBgColor} GLOB '#[0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f]'
        AND length(${t.badgeTextColor}) = 7 AND ${t.badgeTextColor} GLOB '#[0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f]'`,
    ),
  ],
);

export const storeSettings = sqliteTable(
  "store_settings",
  {
    id: integer("id").primaryKey(),
    msrpStartPriceUsd: text("msrp_start_price_usd").notNull().default("300.00"),
    msrpAnchorScore: integer("msrp_anchor_score").notNull().default(10),
    msrpDoublingInterval: integer("msrp_doubling_interval").notNull().default(10),
    checkoutGate: integer("checkout_gate", { mode: "boolean" }).notNull().default(true),
    flashCreditPresetsUsd: text("flash_credit_presets_usd", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'["500.00","1000.00","5000.00"]'`),
    mediaBaseUrl: text("media_base_url").notNull().default(""),
    placeholderMediaId: integer("placeholder_media_id").references(() => media.id, {
      onDelete: "restrict",
    }),
  },
  (t) => [
    check("store_settings_singleton", sql`${t.id} = 1`),
    check("store_settings_start_price", money(t.msrpStartPriceUsd)),
    check("store_settings_anchor", sql`${t.msrpAnchorScore} >= 0`),
    check("store_settings_interval", sql`${t.msrpDoublingInterval} >= 1`),
    check("store_settings_presets_json", sql`json_valid(${t.flashCreditPresetsUsd})`),
  ],
);

// ── Shoppers ─────────────────────────────────────────────────────────────────────────────

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name"),
  ...timestamps,
});

export const sessions = sqliteTable("sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
});

export const carts = sqliteTable(
  "carts",
  {
    id: text("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
    updatedAt: text("updated_at").notNull().default(nowIso),
  },
  (t) => [
    uniqueIndex("carts_user_unique")
      .on(t.userId)
      .where(sql`${t.userId} IS NOT NULL`),
  ],
);

export const cartItems = sqliteTable(
  "cart_items",
  {
    cartId: text("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    shirtId: integer("shirt_id")
      .notNull()
      .references(() => shirts.id, { onDelete: "cascade" }),
    size: text("size", { enum: ["S", "M", "L", "XL", "XXL"] }).notNull(),
    quantity: integer("quantity").notNull(),
    addedAt: text("added_at").notNull().default(nowIso),
  },
  (t) => [
    primaryKey({ columns: [t.cartId, t.shirtId, t.size] }),
    check("cart_items_size", sql`${t.size} IN ('S', 'M', 'L', 'XL', 'XXL')`),
    check("cart_items_quantity", sql`${t.quantity} BETWEEN 1 AND 99`),
  ],
);

export const orders = sqliteTable(
  "orders",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").references(() => users.id, { onDelete: "restrict" }),
    checkoutToken: text("checkout_token").notNull().unique(),
    subtotalUsd: text("subtotal_usd").notNull(),
    shippingUsd: text("shipping_usd").notNull().default("0.00"),
    taxUsd: text("tax_usd").notNull().default("0.00"),
    totalUsd: text("total_usd").notNull(),
    paymentMethod: text("payment_method", { enum: ["card", "flash_credit"] }).notNull(),
    cardBrand: text("card_brand"),
    cardLast4: text("card_last4"),
    ...timestamps,
  },
  (t) => [
    check("orders_subtotal", money(t.subtotalUsd)),
    check("orders_shipping", money(t.shippingUsd)),
    check("orders_tax", money(t.taxUsd)),
    check("orders_total", money(t.totalUsd)),
    check("orders_method", sql`${t.paymentMethod} IN ('card', 'flash_credit')`),
    check(
      "orders_card_fields",
      sql`(${t.paymentMethod} = 'card' AND ${t.cardBrand} IS NOT NULL AND length(${t.cardLast4}) = 4 AND ${t.cardLast4} NOT GLOB '*[^0-9]*')
        OR (${t.paymentMethod} = 'flash_credit' AND ${t.cardBrand} IS NULL AND ${t.cardLast4} IS NULL)`,
    ),
    index("orders_user_created_idx").on(t.userId, t.createdAt),
  ],
);

export const orderItems = sqliteTable(
  "order_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    shirtId: integer("shirt_id")
      .notNull()
      .references(() => shirts.id, { onDelete: "restrict" }),
    shirtName: text("shirt_name").notNull(),
    tierName: text("tier_name").notNull(),
    complexity: integer("complexity").notNull(),
    size: text("size", { enum: ["S", "M", "L", "XL", "XXL"] }).notNull(),
    quantity: integer("quantity").notNull(),
    finalPriceUsd: text("final_price_usd").notNull(),
    msrpUsd: text("msrp_usd").notNull(),
  },
  (t) => [
    check("order_items_quantity", sql`${t.quantity} BETWEEN 1 AND 99`),
    check("order_items_final_price", money(t.finalPriceUsd)),
    check("order_items_msrp", money(t.msrpUsd)),
    index("order_items_order_idx").on(t.orderId),
  ],
);

export const flashCreditEntries = sqliteTable(
  "flash_credit_entries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    amountUsd: text("amount_usd").notNull(),
    kind: text("kind", { enum: ["top_up", "spend"] }).notNull(),
    orderId: integer("order_id").references(() => orders.id, { onDelete: "restrict" }),
    cardBrand: text("card_brand"),
    cardLast4: text("card_last4"),
    ...timestamps,
  },
  (t) => [
    check("flash_credit_amount", money(t.amountUsd)),
    check("flash_credit_nonzero", sql`${t.amountUsd} NOT IN ('0.00', '-0.00')`),
    check(
      "flash_credit_kind",
      sql`(${t.kind} = 'top_up' AND ${t.amountUsd} NOT GLOB '-*' AND ${t.cardBrand} IS NOT NULL AND length(${t.cardLast4}) = 4)
        OR (${t.kind} = 'spend' AND ${t.amountUsd} GLOB '-*' AND ${t.orderId} IS NOT NULL)`,
    ),
    index("flash_credit_user_idx").on(t.userId, t.createdAt),
  ],
);
