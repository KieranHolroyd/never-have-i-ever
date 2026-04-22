CREATE TABLE IF NOT EXISTS `cah_cards` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pack_name` text NOT NULL,
	`card_type` text NOT NULL,
	`text` text NOT NULL,
	`pick` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`questions` text DEFAULT '[]' NOT NULL,
	`is_nsfw` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `categories_name_unique` ON `categories` (`name`);