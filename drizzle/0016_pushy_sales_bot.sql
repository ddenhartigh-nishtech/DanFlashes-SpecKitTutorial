-- Hand-edited after drizzle-kit generate (012): the old table has none of PSSB's columns, so the
-- rebuild copies every existing setting as it is, and PSSB starts on, with no model overrides (the
-- code's default applies) and no support email.
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
	`pushy_sales_bot` integer DEFAULT true NOT NULL,
	`pssb_model_url` text,
	`pssb_model` text,
	`support_email` text,
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
  ) AND "__new_store_settings"."uniquity_surcharge_usd" NOT GLOB '-*'),
	CONSTRAINT "store_settings_pssb_model_url" CHECK("__new_store_settings"."pssb_model_url" IS NULL OR (("__new_store_settings"."pssb_model_url" GLOB 'http://*' OR "__new_store_settings"."pssb_model_url" GLOB 'https://*') AND length("__new_store_settings"."pssb_model_url") <= 200)),
	CONSTRAINT "store_settings_pssb_model" CHECK("__new_store_settings"."pssb_model" IS NULL OR length("__new_store_settings"."pssb_model") BETWEEN 1 AND 80),
	CONSTRAINT "store_settings_support_email" CHECK("__new_store_settings"."support_email" IS NULL OR (length("__new_store_settings"."support_email") BETWEEN 3 AND 120 AND length("__new_store_settings"."support_email") - length(replace("__new_store_settings"."support_email", '@', '')) = 1))
);
--> statement-breakpoint
INSERT INTO `__new_store_settings`("id", "msrp_base_price_usd", "msrp_per_point_usd", "checkout_gate", "flash_credit_presets_usd", "media_base_url", "placeholder_media_id", "bland_shaming", "confirmshaming", "per_diem_drain", "drain_jokes", "fake_scarcity", "countdown_timers", "social_proof", "pre_checked_add_ons", "roach_motel", "flash_mode", "pipes_background", "nosy_sign_up", "pattern_generator", "uniquity_surcharge", "uniquity_surcharge_usd") SELECT "id", "msrp_base_price_usd", "msrp_per_point_usd", "checkout_gate", "flash_credit_presets_usd", "media_base_url", "placeholder_media_id", "bland_shaming", "confirmshaming", "per_diem_drain", "drain_jokes", "fake_scarcity", "countdown_timers", "social_proof", "pre_checked_add_ons", "roach_motel", "flash_mode", "pipes_background", "nosy_sign_up", "pattern_generator", "uniquity_surcharge", "uniquity_surcharge_usd" FROM `store_settings`;--> statement-breakpoint
DROP TABLE `store_settings`;--> statement-breakpoint
ALTER TABLE `__new_store_settings` RENAME TO `store_settings`;--> statement-breakpoint
PRAGMA foreign_keys=ON;