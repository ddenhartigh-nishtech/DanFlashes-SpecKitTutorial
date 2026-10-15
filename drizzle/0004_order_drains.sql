CREATE TABLE `order_drains` (
	`order_id` integer NOT NULL,
	`stream_id` integer NOT NULL,
	PRIMARY KEY(`order_id`, `stream_id`),
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`stream_id`) REFERENCES `revenue_streams`(`id`) ON UPDATE no action ON DELETE restrict
);
