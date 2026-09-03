CREATE TABLE `calendar_memories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entry_date` text NOT NULL,
	`title` text,
	`content` text,
	`video_file_name` text,
	`video_mime_type` text,
	`beneficiary_id` integer,
	`leave_to_beneficiary` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`beneficiary_id`) REFERENCES `beneficiaries`(`id`) ON UPDATE no action ON DELETE set null
);
