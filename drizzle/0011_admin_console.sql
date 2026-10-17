-- Hand-edited after drizzle-kit generate (008): the old table has no grant_token, so the copy
-- writes NULL for every existing entry.
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
	`grant_token` text,
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
	CONSTRAINT "flash_credit_kind" CHECK(("__new_flash_credit_entries"."kind" = 'top_up' AND "__new_flash_credit_entries"."amount_usd" NOT GLOB '-*' AND "__new_flash_credit_entries"."card_brand" IS NOT NULL AND length("__new_flash_credit_entries"."card_last4") = 4
            AND "__new_flash_credit_entries"."grant_token" IS NULL)
        OR ("__new_flash_credit_entries"."kind" = 'spend' AND "__new_flash_credit_entries"."amount_usd" GLOB '-*' AND "__new_flash_credit_entries"."order_id" IS NOT NULL AND "__new_flash_credit_entries"."grant_token" IS NULL)
        OR ("__new_flash_credit_entries"."kind" = 'stream' AND "__new_flash_credit_entries"."amount_usd" NOT GLOB '-*' AND "__new_flash_credit_entries"."stream_id" IS NOT NULL
            AND "__new_flash_credit_entries"."stream_payment_no" IS NOT NULL AND "__new_flash_credit_entries"."stream_payment_no" >= 1
            AND "__new_flash_credit_entries"."order_id" IS NULL AND "__new_flash_credit_entries"."card_brand" IS NULL AND "__new_flash_credit_entries"."card_last4" IS NULL AND "__new_flash_credit_entries"."grant_token" IS NULL)
        OR ("__new_flash_credit_entries"."kind" = 'grant' AND "__new_flash_credit_entries"."amount_usd" NOT GLOB '-*' AND "__new_flash_credit_entries"."grant_token" IS NOT NULL
            AND "__new_flash_credit_entries"."order_id" IS NULL AND "__new_flash_credit_entries"."card_brand" IS NULL AND "__new_flash_credit_entries"."card_last4" IS NULL
            AND "__new_flash_credit_entries"."stream_id" IS NULL AND "__new_flash_credit_entries"."stream_payment_no" IS NULL))
);
--> statement-breakpoint
INSERT INTO `__new_flash_credit_entries`("id", "user_id", "amount_usd", "kind", "order_id", "card_brand", "card_last4", "stream_id", "stream_payment_no", "grant_token", "created_at") SELECT "id", "user_id", "amount_usd", "kind", "order_id", "card_brand", "card_last4", "stream_id", "stream_payment_no", NULL, "created_at" FROM `flash_credit_entries`;--> statement-breakpoint
DROP TABLE `flash_credit_entries`;--> statement-breakpoint
ALTER TABLE `__new_flash_credit_entries` RENAME TO `flash_credit_entries`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `flash_credit_entries_grant_token_unique` ON `flash_credit_entries` (`grant_token`);--> statement-breakpoint
CREATE UNIQUE INDEX `flash_credit_stream_payment_unique` ON `flash_credit_entries` (`stream_id`,`stream_payment_no`);--> statement-breakpoint
CREATE INDEX `flash_credit_user_idx` ON `flash_credit_entries` (`user_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `users` ADD `is_admin` integer DEFAULT false NOT NULL;