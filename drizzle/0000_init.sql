CREATE TABLE `cart_items` (
	`cart_id` text NOT NULL,
	`shirt_id` integer NOT NULL,
	`size` text NOT NULL,
	`quantity` integer NOT NULL,
	`added_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	PRIMARY KEY(`cart_id`, `shirt_id`, `size`),
	FOREIGN KEY (`cart_id`) REFERENCES `carts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`shirt_id`) REFERENCES `shirts`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "cart_items_size" CHECK("cart_items"."size" IN ('S', 'M', 'L', 'XL', 'XXL')),
	CONSTRAINT "cart_items_quantity" CHECK("cart_items"."quantity" BETWEEN 1 AND 99)
);
--> statement-breakpoint
CREATE TABLE `carts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `carts_user_unique` ON `carts` (`user_id`) WHERE "carts"."user_id" IS NOT NULL;--> statement-breakpoint
CREATE TABLE `complexity_tiers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`tagline` text,
	`min_score` integer NOT NULL,
	`badge_bg_color` text NOT NULL,
	`badge_text_color` text NOT NULL,
	CONSTRAINT "tiers_min_score" CHECK("complexity_tiers"."min_score" >= 0),
	CONSTRAINT "tiers_colors" CHECK(length("complexity_tiers"."badge_bg_color") = 7 AND "complexity_tiers"."badge_bg_color" GLOB '#[0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f]'
        AND length("complexity_tiers"."badge_text_color") = 7 AND "complexity_tiers"."badge_text_color" GLOB '#[0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f]')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `complexity_tiers_name_unique` ON `complexity_tiers` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `complexity_tiers_min_score_unique` ON `complexity_tiers` (`min_score`);--> statement-breakpoint
CREATE TABLE `flash_credit_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`amount_usd` text NOT NULL,
	`kind` text NOT NULL,
	`order_id` integer,
	`card_brand` text,
	`card_last4` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "flash_credit_amount" CHECK((
    "flash_credit_entries"."amount_usd" NOT GLOB '*[^0-9.-]*'
    AND "flash_credit_entries"."amount_usd" GLOB '*.[0-9][0-9]'
    AND ("flash_credit_entries"."amount_usd" GLOB '[0-9]*' OR "flash_credit_entries"."amount_usd" GLOB '-[0-9]*')
    AND length("flash_credit_entries"."amount_usd") - length(replace("flash_credit_entries"."amount_usd", '.', '')) = 1
    AND instr(substr("flash_credit_entries"."amount_usd", 2), '-') = 0
  )),
	CONSTRAINT "flash_credit_nonzero" CHECK("flash_credit_entries"."amount_usd" NOT IN ('0.00', '-0.00')),
	CONSTRAINT "flash_credit_kind" CHECK(("flash_credit_entries"."kind" = 'top_up' AND "flash_credit_entries"."amount_usd" NOT GLOB '-*' AND "flash_credit_entries"."card_brand" IS NOT NULL AND length("flash_credit_entries"."card_last4") = 4)
        OR ("flash_credit_entries"."kind" = 'spend' AND "flash_credit_entries"."amount_usd" GLOB '-*' AND "flash_credit_entries"."order_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE INDEX `flash_credit_user_idx` ON `flash_credit_entries` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `media` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`alt` text NOT NULL,
	`kind` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	CONSTRAINT "media_kind" CHECK("media"."kind" IN ('shirt', 'placeholder')),
	CONSTRAINT "media_alt_length" CHECK(length("media"."alt") BETWEEN 1 AND 200),
	CONSTRAINT "media_key_relative" CHECK("media"."key" NOT GLOB '/*' AND "media"."key" NOT LIKE '%..%' AND "media"."key" NOT GLOB '[A-Za-z]:*' AND instr("media"."key", '\') = 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `media_key_unique` ON `media` (`key`);--> statement-breakpoint
CREATE TABLE `order_items` (
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
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`shirt_id`) REFERENCES `shirts`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "order_items_quantity" CHECK("order_items"."quantity" BETWEEN 1 AND 99),
	CONSTRAINT "order_items_final_price" CHECK((
    "order_items"."final_price_usd" NOT GLOB '*[^0-9.-]*'
    AND "order_items"."final_price_usd" GLOB '*.[0-9][0-9]'
    AND ("order_items"."final_price_usd" GLOB '[0-9]*' OR "order_items"."final_price_usd" GLOB '-[0-9]*')
    AND length("order_items"."final_price_usd") - length(replace("order_items"."final_price_usd", '.', '')) = 1
    AND instr(substr("order_items"."final_price_usd", 2), '-') = 0
  )),
	CONSTRAINT "order_items_msrp" CHECK((
    "order_items"."msrp_usd" NOT GLOB '*[^0-9.-]*'
    AND "order_items"."msrp_usd" GLOB '*.[0-9][0-9]'
    AND ("order_items"."msrp_usd" GLOB '[0-9]*' OR "order_items"."msrp_usd" GLOB '-[0-9]*')
    AND length("order_items"."msrp_usd") - length(replace("order_items"."msrp_usd", '.', '')) = 1
    AND instr(substr("order_items"."msrp_usd", 2), '-') = 0
  ))
);
--> statement-breakpoint
CREATE INDEX `order_items_order_idx` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE TABLE `orders` (
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
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "orders_subtotal" CHECK((
    "orders"."subtotal_usd" NOT GLOB '*[^0-9.-]*'
    AND "orders"."subtotal_usd" GLOB '*.[0-9][0-9]'
    AND ("orders"."subtotal_usd" GLOB '[0-9]*' OR "orders"."subtotal_usd" GLOB '-[0-9]*')
    AND length("orders"."subtotal_usd") - length(replace("orders"."subtotal_usd", '.', '')) = 1
    AND instr(substr("orders"."subtotal_usd", 2), '-') = 0
  )),
	CONSTRAINT "orders_shipping" CHECK((
    "orders"."shipping_usd" NOT GLOB '*[^0-9.-]*'
    AND "orders"."shipping_usd" GLOB '*.[0-9][0-9]'
    AND ("orders"."shipping_usd" GLOB '[0-9]*' OR "orders"."shipping_usd" GLOB '-[0-9]*')
    AND length("orders"."shipping_usd") - length(replace("orders"."shipping_usd", '.', '')) = 1
    AND instr(substr("orders"."shipping_usd", 2), '-') = 0
  )),
	CONSTRAINT "orders_tax" CHECK((
    "orders"."tax_usd" NOT GLOB '*[^0-9.-]*'
    AND "orders"."tax_usd" GLOB '*.[0-9][0-9]'
    AND ("orders"."tax_usd" GLOB '[0-9]*' OR "orders"."tax_usd" GLOB '-[0-9]*')
    AND length("orders"."tax_usd") - length(replace("orders"."tax_usd", '.', '')) = 1
    AND instr(substr("orders"."tax_usd", 2), '-') = 0
  )),
	CONSTRAINT "orders_total" CHECK((
    "orders"."total_usd" NOT GLOB '*[^0-9.-]*'
    AND "orders"."total_usd" GLOB '*.[0-9][0-9]'
    AND ("orders"."total_usd" GLOB '[0-9]*' OR "orders"."total_usd" GLOB '-[0-9]*')
    AND length("orders"."total_usd") - length(replace("orders"."total_usd", '.', '')) = 1
    AND instr(substr("orders"."total_usd", 2), '-') = 0
  )),
	CONSTRAINT "orders_method" CHECK("orders"."payment_method" IN ('card', 'flash_credit')),
	CONSTRAINT "orders_card_fields" CHECK(("orders"."payment_method" = 'card' AND "orders"."card_brand" IS NOT NULL AND length("orders"."card_last4") = 4 AND "orders"."card_last4" NOT GLOB '*[^0-9]*')
        OR ("orders"."payment_method" = 'flash_credit' AND "orders"."card_brand" IS NULL AND "orders"."card_last4" IS NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_checkout_token_unique` ON `orders` (`checkout_token`);--> statement-breakpoint
CREATE INDEX `orders_user_created_idx` ON `orders` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_hash_unique` ON `sessions` (`token_hash`);--> statement-breakpoint
CREATE TABLE `shirt_images` (
	`shirt_id` integer NOT NULL,
	`media_id` integer NOT NULL,
	`position` integer NOT NULL,
	PRIMARY KEY(`shirt_id`, `position`),
	FOREIGN KEY (`shirt_id`) REFERENCES `shirts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "shirt_images_position" CHECK("shirt_images"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE `shirts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`style` text NOT NULL,
	`complexity` integer NOT NULL,
	`final_price_usd` text,
	`description` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`featured` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	CONSTRAINT "shirts_slug" CHECK("shirts"."slug" <> '' AND "shirts"."slug" NOT GLOB '*[^a-z0-9-]*'),
	CONSTRAINT "shirts_name_length" CHECK(length("shirts"."name") BETWEEN 1 AND 80),
	CONSTRAINT "shirts_style" CHECK("shirts"."style" IN ('polo', 'button-down')),
	CONSTRAINT "shirts_complexity" CHECK("shirts"."complexity" >= 0),
	CONSTRAINT "shirts_status" CHECK("shirts"."status" IN ('active', 'inactive')),
	CONSTRAINT "shirts_final_price" CHECK("shirts"."final_price_usd" IS NULL OR (
    "shirts"."final_price_usd" NOT GLOB '*[^0-9.-]*'
    AND "shirts"."final_price_usd" GLOB '*.[0-9][0-9]'
    AND ("shirts"."final_price_usd" GLOB '[0-9]*' OR "shirts"."final_price_usd" GLOB '-[0-9]*')
    AND length("shirts"."final_price_usd") - length(replace("shirts"."final_price_usd", '.', '')) = 1
    AND instr(substr("shirts"."final_price_usd", 2), '-') = 0
  ))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shirts_slug_unique` ON `shirts` (`slug`);--> statement-breakpoint
CREATE INDEX `shirts_status_idx` ON `shirts` (`status`);--> statement-breakpoint
CREATE TABLE `store_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`msrp_start_price_usd` text DEFAULT '300.00' NOT NULL,
	`msrp_anchor_score` integer DEFAULT 10 NOT NULL,
	`msrp_doubling_interval` integer DEFAULT 10 NOT NULL,
	`checkout_gate` integer DEFAULT true NOT NULL,
	`flash_credit_presets_usd` text DEFAULT '["500.00","1000.00","5000.00"]' NOT NULL,
	`media_base_url` text DEFAULT '' NOT NULL,
	`placeholder_media_id` integer,
	FOREIGN KEY (`placeholder_media_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "store_settings_singleton" CHECK("store_settings"."id" = 1),
	CONSTRAINT "store_settings_start_price" CHECK((
    "store_settings"."msrp_start_price_usd" NOT GLOB '*[^0-9.-]*'
    AND "store_settings"."msrp_start_price_usd" GLOB '*.[0-9][0-9]'
    AND ("store_settings"."msrp_start_price_usd" GLOB '[0-9]*' OR "store_settings"."msrp_start_price_usd" GLOB '-[0-9]*')
    AND length("store_settings"."msrp_start_price_usd") - length(replace("store_settings"."msrp_start_price_usd", '.', '')) = 1
    AND instr(substr("store_settings"."msrp_start_price_usd", 2), '-') = 0
  )),
	CONSTRAINT "store_settings_anchor" CHECK("store_settings"."msrp_anchor_score" >= 0),
	CONSTRAINT "store_settings_interval" CHECK("store_settings"."msrp_doubling_interval" >= 1),
	CONSTRAINT "store_settings_presets_json" CHECK(json_valid("store_settings"."flash_credit_presets_usd"))
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`display_name` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);