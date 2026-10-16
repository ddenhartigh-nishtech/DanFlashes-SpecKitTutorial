CREATE TABLE `add_ons` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`pitch` text NOT NULL,
	`decline_line` text NOT NULL,
	`price_usd` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	CONSTRAINT "add_ons_name" CHECK(length(trim("add_ons"."name")) BETWEEN 1 AND 60),
	CONSTRAINT "add_ons_pitch" CHECK(length(trim("add_ons"."pitch")) BETWEEN 1 AND 160),
	CONSTRAINT "add_ons_decline_line" CHECK(length(trim("add_ons"."decline_line")) BETWEEN 1 AND 160),
	CONSTRAINT "add_ons_price" CHECK((
    "add_ons"."price_usd" NOT GLOB '*[^0-9.-]*'
    AND "add_ons"."price_usd" GLOB '*.[0-9][0-9]'
    AND ("add_ons"."price_usd" GLOB '[0-9]*' OR "add_ons"."price_usd" GLOB '-[0-9]*')
    AND length("add_ons"."price_usd") - length(replace("add_ons"."price_usd", '.', '')) = 1
    AND instr(substr("add_ons"."price_usd", 2), '-') = 0
  )),
	CONSTRAINT "add_ons_price_positive" CHECK("add_ons"."price_usd" NOT GLOB '-*' AND "add_ons"."price_usd" NOT IN ('0.00'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `add_ons_name_unique` ON `add_ons` (`name`);--> statement-breakpoint
CREATE TABLE `order_add_ons` (
	`order_id` integer NOT NULL,
	`add_on_id` integer NOT NULL,
	`name` text NOT NULL,
	`price_usd` text NOT NULL,
	`position` integer NOT NULL,
	PRIMARY KEY(`order_id`, `add_on_id`),
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`add_on_id`) REFERENCES `add_ons`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "order_add_ons_price" CHECK((
    "order_add_ons"."price_usd" NOT GLOB '*[^0-9.-]*'
    AND "order_add_ons"."price_usd" GLOB '*.[0-9][0-9]'
    AND ("order_add_ons"."price_usd" GLOB '[0-9]*' OR "order_add_ons"."price_usd" GLOB '-[0-9]*')
    AND length("order_add_ons"."price_usd") - length(replace("order_add_ons"."price_usd", '.', '')) = 1
    AND instr(substr("order_add_ons"."price_usd", 2), '-') = 0
  )),
	CONSTRAINT "order_add_ons_price_positive" CHECK("order_add_ons"."price_usd" NOT GLOB '-*' AND "order_add_ons"."price_usd" NOT IN ('0.00'))
);
--> statement-breakpoint
ALTER TABLE `store_settings` ADD `pre_checked_add_ons` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `store_settings` ADD `roach_motel` integer DEFAULT true NOT NULL;