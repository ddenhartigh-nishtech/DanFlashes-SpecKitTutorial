-- Hand-edited after drizzle-kit generate (011 research R2): Dan's mark. A shopper creation he
-- already changed (an edit stamped updated_at, or it has a price, is resting, or is listed) is
-- marked from its updated_at, so the sweep keeps it. Every other row starts unmarked.
ALTER TABLE `shirts` ADD `owner_changed_at` text;--> statement-breakpoint
UPDATE `shirts` SET `owner_changed_at` = `updated_at` WHERE `origin` = 'dial' AND (`updated_at` <> `created_at` OR `final_price_usd` IS NOT NULL OR `status` = 'inactive' OR `listed` = 1);
