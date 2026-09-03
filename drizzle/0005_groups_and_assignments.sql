CREATE TABLE `beneficiary_groups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `beneficiary_group_members` (
	`group_id` integer NOT NULL,
	`beneficiary_id` integer NOT NULL,
	PRIMARY KEY(`group_id`, `beneficiary_id`),
	FOREIGN KEY (`group_id`) REFERENCES `beneficiary_groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`beneficiary_id`) REFERENCES `beneficiaries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `message_beneficiaries` (
	`message_id` integer NOT NULL,
	`beneficiary_id` integer NOT NULL,
	PRIMARY KEY(`message_id`, `beneficiary_id`),
	FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`beneficiary_id`) REFERENCES `beneficiaries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `message_groups` (
	`message_id` integer NOT NULL,
	`group_id` integer NOT NULL,
	PRIMARY KEY(`message_id`, `group_id`),
	FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`group_id`) REFERENCES `beneficiary_groups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `asset_beneficiaries` (
	`asset_id` integer NOT NULL,
	`beneficiary_id` integer NOT NULL,
	PRIMARY KEY(`asset_id`, `beneficiary_id`),
	FOREIGN KEY (`asset_id`) REFERENCES `legacy_assets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`beneficiary_id`) REFERENCES `beneficiaries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `asset_groups` (
	`asset_id` integer NOT NULL,
	`group_id` integer NOT NULL,
	PRIMARY KEY(`asset_id`, `group_id`),
	FOREIGN KEY (`asset_id`) REFERENCES `legacy_assets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`group_id`) REFERENCES `beneficiary_groups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `calendar_beneficiaries` (
	`memory_id` integer NOT NULL,
	`beneficiary_id` integer NOT NULL,
	PRIMARY KEY(`memory_id`, `beneficiary_id`),
	FOREIGN KEY (`memory_id`) REFERENCES `calendar_memories`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`beneficiary_id`) REFERENCES `beneficiaries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `calendar_groups` (
	`memory_id` integer NOT NULL,
	`group_id` integer NOT NULL,
	 PRIMARY KEY(`memory_id`, `group_id`),
	FOREIGN KEY (`memory_id`) REFERENCES `calendar_memories`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`group_id`) REFERENCES `beneficiary_groups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `message_beneficiaries` (`message_id`, `beneficiary_id`)
SELECT `id`, `beneficiary_id` FROM `messages`;
--> statement-breakpoint
INSERT INTO `asset_beneficiaries` (`asset_id`, `beneficiary_id`)
SELECT `id`, `beneficiary_id` FROM `legacy_assets` WHERE `beneficiary_id` IS NOT NULL;
--> statement-breakpoint
INSERT INTO `calendar_beneficiaries` (`memory_id`, `beneficiary_id`)
SELECT `id`, `beneficiary_id` FROM `calendar_memories` WHERE `beneficiary_id` IS NOT NULL;
