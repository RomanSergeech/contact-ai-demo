ALTER TABLE `contact_scraping_logs` MODIFY COLUMN `created_at` timestamp(6) NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `contacts` ADD `recent_activity_summary` text;--> statement-breakpoint
ALTER TABLE `contacts` ADD `recent_topics` text;--> statement-breakpoint
ALTER TABLE `contacts` ADD `conversation_starters` text;--> statement-breakpoint
ALTER TABLE `contacts` ADD `last_activity_analysis_at` timestamp;