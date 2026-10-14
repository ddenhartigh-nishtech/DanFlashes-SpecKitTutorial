-- Hand-edited after drizzle-kit generate (003 owner feedback): existing recurring streams keep the
-- store-wide pay period they were paying on as their own interval, so the revenue_streams rebuild runs
-- before store_settings drops that column.
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
        OR ("__new_flash_credit_entries"."kind" = 'stream' AND "__new_flash_credit_entries"."amount_usd" NOT GLOB '-*' AND "__new_flash_credit_entries"."stream_id" IS NOT NULL
            AND "__new_flash_credit_entries"."stream_payment_no" IS NOT NULL AND "__new_flash_credit_entries"."stream_payment_no" >= 1
            AND "__new_flash_credit_entries"."order_id" IS NULL AND "__new_flash_credit_entries"."card_brand" IS NULL AND "__new_flash_credit_entries"."card_last4" IS NULL))
);--> statement-breakpoint
INSERT INTO `__new_flash_credit_entries`("id", "user_id", "amount_usd", "kind", "order_id", "card_brand", "card_last4", "stream_id", "stream_payment_no", "created_at") SELECT "id", "user_id", "amount_usd", "kind", "order_id", "card_brand", "card_last4", "stream_id", "stream_payment_no", "created_at" FROM `flash_credit_entries`;--> statement-breakpoint
DROP TABLE `flash_credit_entries`;--> statement-breakpoint
ALTER TABLE `__new_flash_credit_entries` RENAME TO `flash_credit_entries`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `flash_credit_stream_payment_unique` ON `flash_credit_entries` (`stream_id`,`stream_payment_no`);--> statement-breakpoint
CREATE INDEX `flash_credit_user_idx` ON `flash_credit_entries` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `__new_revenue_streams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`preset` text,
	`custom_name` text,
	`amount_usd` text NOT NULL,
	`schedule` text NOT NULL,
	`interval_minutes` integer,
	`starts_at` text NOT NULL,
	`ends_at` text,
	`next_due_at` text,
	`payments_made` integer DEFAULT 0 NOT NULL,
	`disconnected_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "revenue_streams_name" CHECK(("__new_revenue_streams"."preset" IS NULL) <> ("__new_revenue_streams"."custom_name" IS NULL)),
	CONSTRAINT "revenue_streams_preset" CHECK("__new_revenue_streams"."preset" IS NULL OR "__new_revenue_streams"."preset" IN ('per_diem', 'expense_report', 'college_fund', 'garage_sale', 'second_mortgage')),
	CONSTRAINT "revenue_streams_custom_name" CHECK("__new_revenue_streams"."custom_name" IS NULL OR length(trim("__new_revenue_streams"."custom_name")) BETWEEN 1 AND 40),
	CONSTRAINT "revenue_streams_amount" CHECK((
    "__new_revenue_streams"."amount_usd" NOT GLOB '*[^0-9.-]*'
    AND "__new_revenue_streams"."amount_usd" GLOB '*.[0-9][0-9]'
    AND ("__new_revenue_streams"."amount_usd" GLOB '[0-9]*' OR "__new_revenue_streams"."amount_usd" GLOB '-[0-9]*')
    AND length("__new_revenue_streams"."amount_usd") - length(replace("__new_revenue_streams"."amount_usd", '.', '')) = 1
    AND instr(substr("__new_revenue_streams"."amount_usd", 2), '-') = 0
  )),
	CONSTRAINT "revenue_streams_amount_positive" CHECK("__new_revenue_streams"."amount_usd" NOT GLOB '-*' AND "__new_revenue_streams"."amount_usd" NOT IN ('0.00')),
	CONSTRAINT "revenue_streams_schedule" CHECK("__new_revenue_streams"."schedule" IN ('recurring', 'one_time', 'whenever')),
	CONSTRAINT "revenue_streams_window" CHECK("__new_revenue_streams"."ends_at" IS NULL OR "__new_revenue_streams"."ends_at" > "__new_revenue_streams"."starts_at"),
	CONSTRAINT "revenue_streams_interval" CHECK(("__new_revenue_streams"."schedule" = 'recurring' AND "__new_revenue_streams"."interval_minutes" IS NOT NULL AND "__new_revenue_streams"."interval_minutes" >= 1)
        OR ("__new_revenue_streams"."schedule" <> 'recurring' AND "__new_revenue_streams"."interval_minutes" IS NULL)),
	CONSTRAINT "revenue_streams_payments" CHECK("__new_revenue_streams"."payments_made" >= 0)
);--> statement-breakpoint
INSERT INTO `__new_revenue_streams`("id", "user_id", "preset", "custom_name", "amount_usd", "schedule", "interval_minutes", "starts_at", "ends_at", "next_due_at", "payments_made", "disconnected_at", "created_at") SELECT "id", "user_id", "preset", "custom_name", "amount_usd", "schedule", CASE WHEN "schedule" = 'recurring' THEN COALESCE((SELECT "stream_pay_period_minutes" FROM `store_settings` WHERE "id" = 1), 5) ELSE NULL END, "starts_at", "ends_at", "next_due_at", "payments_made", "disconnected_at", "created_at" FROM `revenue_streams`;--> statement-breakpoint
DROP TABLE `revenue_streams`;--> statement-breakpoint
ALTER TABLE `__new_revenue_streams` RENAME TO `revenue_streams`;--> statement-breakpoint
CREATE UNIQUE INDEX `revenue_streams_one_per_diem` ON `revenue_streams` (`user_id`) WHERE "revenue_streams"."preset" = 'per_diem' AND "revenue_streams"."disconnected_at" IS NULL;--> statement-breakpoint
CREATE INDEX `revenue_streams_due_idx` ON `revenue_streams` (`user_id`,`next_due_at`);--> statement-breakpoint
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
	CONSTRAINT "store_settings_presets_json" CHECK(json_valid("__new_store_settings"."flash_credit_presets_usd"))
);--> statement-breakpoint
INSERT INTO `__new_store_settings`("id", "msrp_start_price_usd", "msrp_anchor_score", "msrp_doubling_interval", "checkout_gate", "flash_credit_presets_usd", "media_base_url", "placeholder_media_id", "bland_shaming", "confirmshaming", "per_diem_drain") SELECT "id", "msrp_start_price_usd", "msrp_anchor_score", "msrp_doubling_interval", "checkout_gate", "flash_credit_presets_usd", "media_base_url", "placeholder_media_id", "bland_shaming", "confirmshaming", "per_diem_drain" FROM `store_settings`;--> statement-breakpoint
DROP TABLE `store_settings`;--> statement-breakpoint
ALTER TABLE `__new_store_settings` RENAME TO `store_settings`;
