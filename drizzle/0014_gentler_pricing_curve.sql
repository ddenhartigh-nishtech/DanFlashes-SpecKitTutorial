-- Hand-edited after drizzle-kit generate (010 research R3): the exponential's three dials (start
-- price, anchor score, doubling interval) have no straight-line equivalent, so the rebuild copies
-- every other setting as it is and the two new dials start at their defaults ($50.00 + $25.00 a
-- point). Then every price Dan set himself is cleared (spec Q2), so every shirt sells at its new
-- MSRP. Orders keep their snapshots. db:migrate backs the database up first.
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_store_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`msrp_base_price_usd` text DEFAULT '50.00' NOT NULL,
	`msrp_per_point_usd` text DEFAULT '25.00' NOT NULL,
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
	CONSTRAINT "store_settings_base_price" CHECK((
    "__new_store_settings"."msrp_base_price_usd" NOT GLOB '*[^0-9.-]*'
    AND "__new_store_settings"."msrp_base_price_usd" GLOB '*.[0-9][0-9]'
    AND ("__new_store_settings"."msrp_base_price_usd" GLOB '[0-9]*' OR "__new_store_settings"."msrp_base_price_usd" GLOB '-[0-9]*')
    AND length("__new_store_settings"."msrp_base_price_usd") - length(replace("__new_store_settings"."msrp_base_price_usd", '.', '')) = 1
    AND instr(substr("__new_store_settings"."msrp_base_price_usd", 2), '-') = 0
  ) AND "__new_store_settings"."msrp_base_price_usd" NOT GLOB '-*' AND "__new_store_settings"."msrp_base_price_usd" <> '0.00'),
	CONSTRAINT "store_settings_per_point" CHECK((
    "__new_store_settings"."msrp_per_point_usd" NOT GLOB '*[^0-9.-]*'
    AND "__new_store_settings"."msrp_per_point_usd" GLOB '*.[0-9][0-9]'
    AND ("__new_store_settings"."msrp_per_point_usd" GLOB '[0-9]*' OR "__new_store_settings"."msrp_per_point_usd" GLOB '-[0-9]*')
    AND length("__new_store_settings"."msrp_per_point_usd") - length(replace("__new_store_settings"."msrp_per_point_usd", '.', '')) = 1
    AND instr(substr("__new_store_settings"."msrp_per_point_usd", 2), '-') = 0
  ) AND "__new_store_settings"."msrp_per_point_usd" NOT GLOB '-*' AND "__new_store_settings"."msrp_per_point_usd" <> '0.00'),
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
INSERT INTO `__new_store_settings`("id", "checkout_gate", "flash_credit_presets_usd", "media_base_url", "placeholder_media_id", "bland_shaming", "confirmshaming", "per_diem_drain", "drain_jokes", "fake_scarcity", "countdown_timers", "social_proof", "pre_checked_add_ons", "roach_motel", "flash_mode", "pipes_background", "nosy_sign_up", "pattern_generator", "uniquity_surcharge", "uniquity_surcharge_usd") SELECT "id", "checkout_gate", "flash_credit_presets_usd", "media_base_url", "placeholder_media_id", "bland_shaming", "confirmshaming", "per_diem_drain", "drain_jokes", "fake_scarcity", "countdown_timers", "social_proof", "pre_checked_add_ons", "roach_motel", "flash_mode", "pipes_background", "nosy_sign_up", "pattern_generator", "uniquity_surcharge", "uniquity_surcharge_usd" FROM `store_settings`;--> statement-breakpoint
DROP TABLE `store_settings`;--> statement-breakpoint
ALTER TABLE `__new_store_settings` RENAME TO `store_settings`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
UPDATE `shirts` SET `final_price_usd` = NULL, `updated_at` = (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) WHERE `final_price_usd` IS NOT NULL;--> statement-breakpoint
UPDATE `shirts` SET `description` = 'Tropical, itemized, and deductible in your heart.' WHERE `slug` = 'hawaiian-tax-return' AND `description` = 'Tropical, itemized, and deductible in your heart. Priced by Dan personally.';
