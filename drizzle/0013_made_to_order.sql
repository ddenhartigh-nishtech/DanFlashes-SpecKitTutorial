-- Hand-edited after drizzle-kit generate (007 owner review): the old tables have no maker or
-- surcharge columns, so every shirt starts with no maker, every order and line with $0.00 of
-- surcharge, and the settings with the surcharge on at $499.99. Then each shopper-made shirt
-- takes the account on its earliest order as its maker (research R14).
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_order_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`shirt_id` integer NOT NULL,
	`shirt_name` text NOT NULL,
	`tier_name` text NOT NULL,
	`complexity` integer NOT NULL,
	`size` text NOT NULL,
	`quantity` integer NOT NULL,
	`final_price_usd` text NOT NULL,
	`msrp_usd` text NOT NULL,
	`surcharge_usd` text DEFAULT '0.00' NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`shirt_id`) REFERENCES `shirts`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "order_items_quantity" CHECK("__new_order_items"."quantity" BETWEEN 1 AND 99),
	CONSTRAINT "order_items_final_price" CHECK((
    "__new_order_items"."final_price_usd" NOT GLOB '*[^0-9.-]*'
    AND "__new_order_items"."final_price_usd" GLOB '*.[0-9][0-9]'
    AND ("__new_order_items"."final_price_usd" GLOB '[0-9]*' OR "__new_order_items"."final_price_usd" GLOB '-[0-9]*')
    AND length("__new_order_items"."final_price_usd") - length(replace("__new_order_items"."final_price_usd", '.', '')) = 1
    AND instr(substr("__new_order_items"."final_price_usd", 2), '-') = 0
  )),
	CONSTRAINT "order_items_msrp" CHECK((
    "__new_order_items"."msrp_usd" NOT GLOB '*[^0-9.-]*'
    AND "__new_order_items"."msrp_usd" GLOB '*.[0-9][0-9]'
    AND ("__new_order_items"."msrp_usd" GLOB '[0-9]*' OR "__new_order_items"."msrp_usd" GLOB '-[0-9]*')
    AND length("__new_order_items"."msrp_usd") - length(replace("__new_order_items"."msrp_usd", '.', '')) = 1
    AND instr(substr("__new_order_items"."msrp_usd", 2), '-') = 0
  )),
	CONSTRAINT "order_items_surcharge" CHECK((
    "__new_order_items"."surcharge_usd" NOT GLOB '*[^0-9.-]*'
    AND "__new_order_items"."surcharge_usd" GLOB '*.[0-9][0-9]'
    AND ("__new_order_items"."surcharge_usd" GLOB '[0-9]*' OR "__new_order_items"."surcharge_usd" GLOB '-[0-9]*')
    AND length("__new_order_items"."surcharge_usd") - length(replace("__new_order_items"."surcharge_usd", '.', '')) = 1
    AND instr(substr("__new_order_items"."surcharge_usd", 2), '-') = 0
  ))
);
--> statement-breakpoint
INSERT INTO `__new_order_items`("id", "order_id", "shirt_id", "shirt_name", "tier_name", "complexity", "size", "quantity", "final_price_usd", "msrp_usd", "surcharge_usd") SELECT "id", "order_id", "shirt_id", "shirt_name", "tier_name", "complexity", "size", "quantity", "final_price_usd", "msrp_usd", '0.00' FROM `order_items`;--> statement-breakpoint
DROP TABLE `order_items`;--> statement-breakpoint
ALTER TABLE `__new_order_items` RENAME TO `order_items`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `order_items_order_idx` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE TABLE `__new_orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`checkout_token` text NOT NULL,
	`subtotal_usd` text NOT NULL,
	`shipping_usd` text DEFAULT '0.00' NOT NULL,
	`tax_usd` text DEFAULT '0.00' NOT NULL,
	`total_usd` text NOT NULL,
	`payment_method` text NOT NULL,
	`card_brand` text,
	`card_last4` text,
	`flash_credit_usd` text DEFAULT '0.00' NOT NULL,
	`per_diem_drained` integer DEFAULT false NOT NULL,
	`surcharge_usd` text DEFAULT '0.00' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "orders_subtotal" CHECK((
    "__new_orders"."subtotal_usd" NOT GLOB '*[^0-9.-]*'
    AND "__new_orders"."subtotal_usd" GLOB '*.[0-9][0-9]'
    AND ("__new_orders"."subtotal_usd" GLOB '[0-9]*' OR "__new_orders"."subtotal_usd" GLOB '-[0-9]*')
    AND length("__new_orders"."subtotal_usd") - length(replace("__new_orders"."subtotal_usd", '.', '')) = 1
    AND instr(substr("__new_orders"."subtotal_usd", 2), '-') = 0
  )),
	CONSTRAINT "orders_shipping" CHECK((
    "__new_orders"."shipping_usd" NOT GLOB '*[^0-9.-]*'
    AND "__new_orders"."shipping_usd" GLOB '*.[0-9][0-9]'
    AND ("__new_orders"."shipping_usd" GLOB '[0-9]*' OR "__new_orders"."shipping_usd" GLOB '-[0-9]*')
    AND length("__new_orders"."shipping_usd") - length(replace("__new_orders"."shipping_usd", '.', '')) = 1
    AND instr(substr("__new_orders"."shipping_usd", 2), '-') = 0
  )),
	CONSTRAINT "orders_tax" CHECK((
    "__new_orders"."tax_usd" NOT GLOB '*[^0-9.-]*'
    AND "__new_orders"."tax_usd" GLOB '*.[0-9][0-9]'
    AND ("__new_orders"."tax_usd" GLOB '[0-9]*' OR "__new_orders"."tax_usd" GLOB '-[0-9]*')
    AND length("__new_orders"."tax_usd") - length(replace("__new_orders"."tax_usd", '.', '')) = 1
    AND instr(substr("__new_orders"."tax_usd", 2), '-') = 0
  )),
	CONSTRAINT "orders_total" CHECK((
    "__new_orders"."total_usd" NOT GLOB '*[^0-9.-]*'
    AND "__new_orders"."total_usd" GLOB '*.[0-9][0-9]'
    AND ("__new_orders"."total_usd" GLOB '[0-9]*' OR "__new_orders"."total_usd" GLOB '-[0-9]*')
    AND length("__new_orders"."total_usd") - length(replace("__new_orders"."total_usd", '.', '')) = 1
    AND instr(substr("__new_orders"."total_usd", 2), '-') = 0
  )),
	CONSTRAINT "orders_method" CHECK("__new_orders"."payment_method" IN ('card', 'flash_credit', 'split')),
	CONSTRAINT "orders_flash_credit" CHECK((
    "__new_orders"."flash_credit_usd" NOT GLOB '*[^0-9.-]*'
    AND "__new_orders"."flash_credit_usd" GLOB '*.[0-9][0-9]'
    AND ("__new_orders"."flash_credit_usd" GLOB '[0-9]*' OR "__new_orders"."flash_credit_usd" GLOB '-[0-9]*')
    AND length("__new_orders"."flash_credit_usd") - length(replace("__new_orders"."flash_credit_usd", '.', '')) = 1
    AND instr(substr("__new_orders"."flash_credit_usd", 2), '-') = 0
  )),
	CONSTRAINT "orders_surcharge" CHECK((
    "__new_orders"."surcharge_usd" NOT GLOB '*[^0-9.-]*'
    AND "__new_orders"."surcharge_usd" GLOB '*.[0-9][0-9]'
    AND ("__new_orders"."surcharge_usd" GLOB '[0-9]*' OR "__new_orders"."surcharge_usd" GLOB '-[0-9]*')
    AND length("__new_orders"."surcharge_usd") - length(replace("__new_orders"."surcharge_usd", '.', '')) = 1
    AND instr(substr("__new_orders"."surcharge_usd", 2), '-') = 0
  )),
	CONSTRAINT "orders_payment" CHECK(("__new_orders"."payment_method" = 'card' AND "__new_orders"."flash_credit_usd" = '0.00' AND "__new_orders"."card_brand" IS NOT NULL AND length("__new_orders"."card_last4") = 4 AND "__new_orders"."card_last4" NOT GLOB '*[^0-9]*')
        OR ("__new_orders"."payment_method" = 'flash_credit' AND "__new_orders"."flash_credit_usd" = "__new_orders"."total_usd" AND "__new_orders"."card_brand" IS NULL AND "__new_orders"."card_last4" IS NULL)
        OR ("__new_orders"."payment_method" = 'split' AND "__new_orders"."flash_credit_usd" NOT IN ('0.00') AND "__new_orders"."flash_credit_usd" NOT GLOB '-*' AND "__new_orders"."card_brand" IS NOT NULL AND length("__new_orders"."card_last4") = 4 AND "__new_orders"."card_last4" NOT GLOB '*[^0-9]*'))
);
--> statement-breakpoint
INSERT INTO `__new_orders`("id", "user_id", "checkout_token", "subtotal_usd", "shipping_usd", "tax_usd", "total_usd", "payment_method", "card_brand", "card_last4", "flash_credit_usd", "per_diem_drained", "surcharge_usd", "created_at") SELECT "id", "user_id", "checkout_token", "subtotal_usd", "shipping_usd", "tax_usd", "total_usd", "payment_method", "card_brand", "card_last4", "flash_credit_usd", "per_diem_drained", '0.00', "created_at" FROM `orders`;--> statement-breakpoint
DROP TABLE `orders`;--> statement-breakpoint
ALTER TABLE `__new_orders` RENAME TO `orders`;--> statement-breakpoint
CREATE UNIQUE INDEX `orders_checkout_token_unique` ON `orders` (`checkout_token`);--> statement-breakpoint
CREATE INDEX `orders_user_created_idx` ON `orders` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `__new_shirts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`style` text NOT NULL,
	`complexity` integer NOT NULL,
	`final_price_usd` text,
	`description` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`featured` integer DEFAULT false NOT NULL,
	`origin` text DEFAULT 'catalog' NOT NULL,
	`recipe` text,
	`listed` integer DEFAULT true NOT NULL,
	`maker_user_id` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`maker_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "shirts_origin" CHECK("__new_shirts"."origin" IN ('catalog', 'owner', 'dial')),
	CONSTRAINT "shirts_recipe" CHECK(("__new_shirts"."origin" = 'catalog') = ("__new_shirts"."recipe" IS NULL)),
	CONSTRAINT "shirts_listed" CHECK("__new_shirts"."origin" = 'dial' OR "__new_shirts"."listed" = 1),
	CONSTRAINT "shirts_maker" CHECK("__new_shirts"."origin" = 'dial' OR "__new_shirts"."maker_user_id" IS NULL),
	CONSTRAINT "shirts_slug" CHECK("__new_shirts"."slug" <> '' AND "__new_shirts"."slug" NOT GLOB '*[^a-z0-9-]*'),
	CONSTRAINT "shirts_name_length" CHECK(length("__new_shirts"."name") BETWEEN 1 AND 80),
	CONSTRAINT "shirts_style" CHECK("__new_shirts"."style" IN ('polo', 'button-down')),
	CONSTRAINT "shirts_complexity" CHECK("__new_shirts"."complexity" >= 0),
	CONSTRAINT "shirts_status" CHECK("__new_shirts"."status" IN ('active', 'inactive')),
	CONSTRAINT "shirts_final_price" CHECK("__new_shirts"."final_price_usd" IS NULL OR (
    "__new_shirts"."final_price_usd" NOT GLOB '*[^0-9.-]*'
    AND "__new_shirts"."final_price_usd" GLOB '*.[0-9][0-9]'
    AND ("__new_shirts"."final_price_usd" GLOB '[0-9]*' OR "__new_shirts"."final_price_usd" GLOB '-[0-9]*')
    AND length("__new_shirts"."final_price_usd") - length(replace("__new_shirts"."final_price_usd", '.', '')) = 1
    AND instr(substr("__new_shirts"."final_price_usd", 2), '-') = 0
  ))
);
--> statement-breakpoint
INSERT INTO `__new_shirts`("id", "slug", "name", "style", "complexity", "final_price_usd", "description", "status", "featured", "origin", "recipe", "listed", "maker_user_id", "created_at", "updated_at") SELECT "id", "slug", "name", "style", "complexity", "final_price_usd", "description", "status", "featured", "origin", "recipe", "listed", NULL, "created_at", "updated_at" FROM `shirts`;--> statement-breakpoint
DROP TABLE `shirts`;--> statement-breakpoint
ALTER TABLE `__new_shirts` RENAME TO `shirts`;--> statement-breakpoint
CREATE UNIQUE INDEX `shirts_slug_unique` ON `shirts` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `shirts_recipe_unique` ON `shirts` (`recipe`);--> statement-breakpoint
CREATE INDEX `shirts_status_idx` ON `shirts` (`status`);--> statement-breakpoint
CREATE TABLE `__new_store_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`msrp_start_price_usd` text DEFAULT '300.00' NOT NULL,
	`msrp_anchor_score` integer DEFAULT 10 NOT NULL,
	`msrp_doubling_interval` integer DEFAULT 10 NOT NULL,
	`checkout_gate` integer DEFAULT true NOT NULL,
	`flash_credit_presets_usd` text DEFAULT '["500.00","1000.00","5000.00"]' NOT NULL,
	`media_base_url` text DEFAULT '' NOT NULL,
	`placeholder_media_id` integer,
	`bland_shaming` integer DEFAULT true NOT NULL,
	`confirmshaming` integer DEFAULT true NOT NULL,
	`per_diem_drain` integer DEFAULT true NOT NULL,
	`drain_jokes` integer DEFAULT true NOT NULL,
	`fake_scarcity` integer DEFAULT true NOT NULL,
	`countdown_timers` integer DEFAULT true NOT NULL,
	`social_proof` integer DEFAULT true NOT NULL,
	`pre_checked_add_ons` integer DEFAULT true NOT NULL,
	`roach_motel` integer DEFAULT true NOT NULL,
	`flash_mode` integer DEFAULT true NOT NULL,
	`pipes_background` integer DEFAULT true NOT NULL,
	`nosy_sign_up` integer DEFAULT true NOT NULL,
	`pattern_generator` integer DEFAULT true NOT NULL,
	`uniquity_surcharge` integer DEFAULT true NOT NULL,
	`uniquity_surcharge_usd` text DEFAULT '499.99' NOT NULL,
	FOREIGN KEY (`placeholder_media_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "store_settings_singleton" CHECK("__new_store_settings"."id" = 1),
	CONSTRAINT "store_settings_start_price" CHECK((
    "__new_store_settings"."msrp_start_price_usd" NOT GLOB '*[^0-9.-]*'
    AND "__new_store_settings"."msrp_start_price_usd" GLOB '*.[0-9][0-9]'
    AND ("__new_store_settings"."msrp_start_price_usd" GLOB '[0-9]*' OR "__new_store_settings"."msrp_start_price_usd" GLOB '-[0-9]*')
    AND length("__new_store_settings"."msrp_start_price_usd") - length(replace("__new_store_settings"."msrp_start_price_usd", '.', '')) = 1
    AND instr(substr("__new_store_settings"."msrp_start_price_usd", 2), '-') = 0
  )),
	CONSTRAINT "store_settings_anchor" CHECK("__new_store_settings"."msrp_anchor_score" >= 0),
	CONSTRAINT "store_settings_interval" CHECK("__new_store_settings"."msrp_doubling_interval" >= 1),
	CONSTRAINT "store_settings_presets_json" CHECK(json_valid("__new_store_settings"."flash_credit_presets_usd")),
	CONSTRAINT "store_settings_surcharge" CHECK((
    "__new_store_settings"."uniquity_surcharge_usd" NOT GLOB '*[^0-9.-]*'
    AND "__new_store_settings"."uniquity_surcharge_usd" GLOB '*.[0-9][0-9]'
    AND ("__new_store_settings"."uniquity_surcharge_usd" GLOB '[0-9]*' OR "__new_store_settings"."uniquity_surcharge_usd" GLOB '-[0-9]*')
    AND length("__new_store_settings"."uniquity_surcharge_usd") - length(replace("__new_store_settings"."uniquity_surcharge_usd", '.', '')) = 1
    AND instr(substr("__new_store_settings"."uniquity_surcharge_usd", 2), '-') = 0
  ) AND "__new_store_settings"."uniquity_surcharge_usd" NOT GLOB '-*')
);
--> statement-breakpoint
INSERT INTO `__new_store_settings`("id", "msrp_start_price_usd", "msrp_anchor_score", "msrp_doubling_interval", "checkout_gate", "flash_credit_presets_usd", "media_base_url", "placeholder_media_id", "bland_shaming", "confirmshaming", "per_diem_drain", "drain_jokes", "fake_scarcity", "countdown_timers", "social_proof", "pre_checked_add_ons", "roach_motel", "flash_mode", "pipes_background", "nosy_sign_up", "pattern_generator", "uniquity_surcharge", "uniquity_surcharge_usd") SELECT "id", "msrp_start_price_usd", "msrp_anchor_score", "msrp_doubling_interval", "checkout_gate", "flash_credit_presets_usd", "media_base_url", "placeholder_media_id", "bland_shaming", "confirmshaming", "per_diem_drain", "drain_jokes", "fake_scarcity", "countdown_timers", "social_proof", "pre_checked_add_ons", "roach_motel", "flash_mode", "pipes_background", "nosy_sign_up", "pattern_generator", 1, '499.99' FROM `store_settings`;--> statement-breakpoint
DROP TABLE `store_settings`;--> statement-breakpoint
ALTER TABLE `__new_store_settings` RENAME TO `store_settings`;
--> statement-breakpoint
UPDATE `shirts` SET `maker_user_id` = (
  SELECT o.`user_id` FROM `order_items` i JOIN `orders` o ON o.`id` = i.`order_id`
  WHERE i.`shirt_id` = `shirts`.`id` AND o.`user_id` IS NOT NULL
  ORDER BY o.`created_at`, o.`id` LIMIT 1
) WHERE `origin` = 'dial';
