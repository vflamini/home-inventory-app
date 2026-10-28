CREATE TABLE `locations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`icon` text DEFAULT '📍' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `locations_name_unique` ON `locations` (`name`);--> statement-breakpoint
ALTER TABLE `items` ADD `location_id` integer REFERENCES locations(id);