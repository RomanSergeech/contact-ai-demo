CREATE TABLE `contact_scraping_logs` (
	`id` varchar(36) NOT NULL,
	`contact_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`platform` enum('telegram','vk') NOT NULL,
	`field` varchar(100),
	`old_value` text,
	`new_value` text,
	`resolved_value` text,
	`status` enum('applied','conflict','resolved','error') NOT NULL,
	`message` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `contact_scraping_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `vk_service_token` text;--> statement-breakpoint
ALTER TABLE `users` ADD `telegram_session` text;