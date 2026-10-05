CREATE TABLE `trusted_contacts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`phone` text,
	`notes` text,
	`handoff_instruction` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
