-- Hand-edited after drizzle-kit generate (003 T004): the table rebuilds copied columns the old tables
-- do not have yet. Existing rows get NULL stream fields, a flash_credit_usd backfilled from the order
-- (total for Flash Credit orders, 0.00 for card orders), and the new settings defaults.
CREATE TABLE `revenue_streams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`preset` text,
	`custom_name` text,
	`amount_usd` text NOT NULL,
	`schedule` text NOT NULL,
	`starts_at` text NOT NULL,
	`ends_at` text,
	`next_due_at` text,
	`payments_made` integer DEFAULT 0 NOT NULL,
	`disconnected_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "revenue_streams_name" CHECK(("revenue_streams"."preset" IS NULL) <> ("revenue_streams"."custom_name" IS NULL)),
	CONSTRAINT "revenue_streams_preset" CHECK("revenue_streams"."preset" IS NULL OR "revenue_streams"."preset" IN ('per_diem', 'expense_report', 'college_fund', 'garage_sale', 'second_mortgage')),
	CONSTRAINT "revenue_streams_custom_name" CHECK("revenue_streams"."custom_name" IS NULL OR length(trim("revenue_streams"."custom_name")) BETWEEN 1 AND 40),
	CONSTRAINT "revenue_streams_amount" CHECK((
    "revenue_streams"."amount_usd" NOT GLOB '*[^0-9.-]*'
    AND "revenue_streams"."amount_usd" GLOB '*.[0-9][0-9]'
    AND ("revenue_streams"."amount_usd" GLOB '[0-9]*' OR "revenue_streams"."amount_usd" GLOB '-[0-9]*')
    AND length("revenue_streams"."amount_usd") - length(replace("revenue_streams"."amount_usd", '.', '')) = 1
    AND instr(substr("revenue_streams"."amount_usd", 2), '-') = 0
  )),
	CONSTRAINT "revenue_streams_amount_positive" CHECK("revenue_streams"."amount_usd" NOT GLOB '-*' AND "revenue_streams"."amount_usd" NOT IN ('0.00')),
	CONSTRAINT "revenue_streams_schedule" CHECK("revenue_streams"."schedule" IN ('recurring', 'one_time', 'whenever')),
	CONSTRAINT "revenue_streams_window" CHECK("revenue_streams"."ends_at" IS NULL OR "revenue_streams"."ends_at" > "revenue_streams"."starts_at"),
	CONSTRAINT "revenue_streams_payments" CHECK("revenue_streams"."payments_made" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `revenue_streams_one_per_diem` ON `revenue_streams` (`user_id`) WHERE "revenue_streams"."preset" = 'per_diem' AND "revenue_streams"."disconnected_at" IS NULL;--> statement-breakpoint
CREATE INDEX `revenue_streams_due_idx` ON `revenue_streams` (`user_id`,`next_due_at`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_flash_credit_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`amount_usd` text NOT NULL,
	`kind` text NOT NULL,
	`order_id` integer,
	`card_brand` text,
	`card_last4` text,
	`stream_id` integer,
	`stream_payment_no` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`stream_id`) REFERENCES `revenue_streams`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "flash_credit_amount" CHECK((
    "__new_flash_credit_entries"."amount_usd" NOT GLOB '*[^0-9.-]*'
    AND "__new_flash_credit_entries"."amount_usd" GLOB '*.[0-9][0-9]'
    AND ("__new_flash_credit_entries"."amount_usd" GLOB '[0-9]*' OR "__new_flash_credit_entries"."amount_usd" GLOB '-[0-9]*')
    AND length("__new_flash_credit_entries"."amount_usd") - length(replace("__new_flash_credit_entries"."amount_usd", '.', '')) = 1
    AND instr(substr("__new_flash_credit_entries"."amount_usd", 2), '-') = 0
  )),
	CONSTRAINT "flash_credit_nonzero" CHECK("__new_flash_credit_entries"."amount_usd" NOT IN ('0.00', '-0.00')),
	CONSTRAINT "flash_credit_kind" CHECK(("__new_flash_credit_entries"."kind" = 'top_up' AND "__new_flash_credit_entries"."amount_usd" NOT GLOB '-*' AND "__new_flash_credit_entries"."card_brand" IS NOT NULL AND length("__new_flash_credit_entries"."card_last4") = 4)
        OR ("__new_flash_credit_entries"."kind" = 'spend' AND "__new_flash_credit_entries"."amount_usd" GLOB '-*' AND "__new_flash_credit_entries"."order_id" IS NOT NULL)
        OR ("__new_flash_credit_entries"."kind" = 'stream' AND "__new_flash_credit_entries"."amount_usd" NOT GLOB '-*' AND "__new_flash_credit_entries"."stream_id" IS NOT NULL AND "__new_flash_credit_entries"."stream_payment_no" >= 1
            AND "__new_flash_credit_entries"."order_id" IS NULL AND "__new_flash_credit_entries"."card_brand" IS NULL AND "__new_flash_credit_entries"."card_last4" IS NULL))
);
--> statement-breakpoint
INSERT INTO `__new_flash_credit_entries`("id", "user_id", "amount_usd", "kind", "order_id", "card_brand", "card_last4", "stream_id", "stream_payment_no", "created_at") SELECT "id", "user_id", "amount_usd", "kind", "order_id", "card_brand", "card_last4", NULL, NULL, "created_at" FROM `flash_credit_entries`;--> statement-breakpoint
DROP TABLE `flash_credit_entries`;--> statement-breakpoint
ALTER TABLE `__new_flash_credit_entries` RENAME TO `flash_credit_entries`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `flash_credit_stream_payment_unique` ON `flash_credit_entries` (`stream_id`,`stream_payment_no`);--> statement-breakpoint
CREATE INDEX `flash_credit_user_idx` ON `flash_credit_entries` (`user_id`,`created_at`);--> statement-breakpoint
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
	CONSTRAINT "orders_payment" CHECK(("__new_orders"."payment_method" = 'card' AND "__new_orders"."flash_credit_usd" = '0.00' AND "__new_orders"."card_brand" IS NOT NULL AND length("__new_orders"."card_last4") = 4 AND "__new_orders"."card_last4" NOT GLOB '*[^0-9]*')
        OR ("__new_orders"."payment_method" = 'flash_credit' AND "__new_orders"."flash_credit_usd" = "__new_orders"."total_usd" AND "__new_orders"."card_brand" IS NULL AND "__new_orders"."card_last4" IS NULL)
        OR ("__new_orders"."payment_method" = 'split' AND "__new_orders"."flash_credit_usd" NOT IN ('0.00') AND "__new_orders"."flash_credit_usd" NOT GLOB '-*' AND "__new_orders"."card_brand" IS NOT NULL AND length("__new_orders"."card_last4") = 4 AND "__new_orders"."card_last4" NOT GLOB '*[^0-9]*'))
);
--> statement-breakpoint
INSERT INTO `__new_orders`("id", "user_id", "checkout_token", "subtotal_usd", "shipping_usd", "tax_usd", "total_usd", "payment_method", "card_brand", "card_last4", "flash_credit_usd", "per_diem_drained", "created_at") SELECT "id", "user_id", "checkout_token", "subtotal_usd", "shipping_usd", "tax_usd", "total_usd", "payment_method", "card_brand", "card_last4", CASE WHEN "payment_method" = 'flash_credit' THEN "total_usd" ELSE '0.00' END, 0, "created_at" FROM `orders`;--> statement-breakpoint
DROP TABLE `orders`;--> statement-breakpoint
ALTER TABLE `__new_orders` RENAME TO `orders`;--> statement-breakpoint
CREATE UNIQUE INDEX `orders_checkout_token_unique` ON `orders` (`checkout_token`);--> statement-breakpoint
CREATE INDEX `orders_user_created_idx` ON `orders` (`user_id`,`created_at`);--> statement-breakpoint
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
	`stream_pay_period_minutes` integer DEFAULT 5 NOT NULL,
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
	CONSTRAINT "store_settings_pay_period" CHECK("__new_store_settings"."stream_pay_period_minutes" >= 1)
);
--> statement-breakpoint
INSERT INTO `__new_store_settings`("id", "msrp_start_price_usd", "msrp_anchor_score", "msrp_doubling_interval", "checkout_gate", "flash_credit_presets_usd", "media_base_url", "placeholder_media_id", "bland_shaming", "confirmshaming", "per_diem_drain", "stream_pay_period_minutes") SELECT "id", "msrp_start_price_usd", "msrp_anchor_score", "msrp_doubling_interval", "checkout_gate", "flash_credit_presets_usd", "media_base_url", "placeholder_media_id", "bland_shaming", "confirmshaming", 1, 5 FROM `store_settings`;--> statement-breakpoint
DROP TABLE `store_settings`;--> statement-breakpoint
ALTER TABLE `__new_store_settings` RENAME TO `store_settings`;