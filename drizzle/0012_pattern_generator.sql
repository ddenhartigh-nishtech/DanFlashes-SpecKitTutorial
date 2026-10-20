-- Hand-edited after drizzle-kit generate (007): the old table has no origin, recipe or listed, so
-- every existing shirt is copied as a listed catalog shirt.
PRAGMA foreign_keys=OFF;--> statement-breakpoint
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
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	CONSTRAINT "shirts_origin" CHECK("__new_shirts"."origin" IN ('catalog', 'owner', 'dial')),
	CONSTRAINT "shirts_recipe" CHECK(("__new_shirts"."origin" = 'catalog') = ("__new_shirts"."recipe" IS NULL)),
	CONSTRAINT "shirts_listed" CHECK("__new_shirts"."origin" = 'dial' OR "__new_shirts"."listed" = 1),
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
INSERT INTO `__new_shirts`("id", "slug", "name", "style", "complexity", "final_price_usd", "description", "status", "featured", "origin", "recipe", "listed", "created_at", "updated_at") SELECT "id", "slug", "name", "style", "complexity", "final_price_usd", "description", "status", "featured", 'catalog', NULL, 1, "created_at", "updated_at" FROM `shirts`;--> statement-breakpoint
DROP TABLE `shirts`;--> statement-breakpoint
ALTER TABLE `__new_shirts` RENAME TO `shirts`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `shirts_slug_unique` ON `shirts` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `shirts_recipe_unique` ON `shirts` (`recipe`);--> statement-breakpoint
CREATE INDEX `shirts_status_idx` ON `shirts` (`status`);--> statement-breakpoint
ALTER TABLE `store_settings` ADD `pattern_generator` integer DEFAULT true NOT NULL;