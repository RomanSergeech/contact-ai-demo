ALTER TABLE `contacts` RENAME COLUMN `last_activity_analysis_at` TO `last_vk_analysis_at`;--> statement-breakpoint
ALTER TABLE `contacts` ADD `last_tg_analysis_at` timestamp;
