ALTER TABLE `users` DROP COLUMN `vk_service_token`;--> statement-breakpoint
ALTER TABLE `users` ADD `vk_access_token` text;--> statement-breakpoint
ALTER TABLE `users` ADD `vk_refresh_token` text;--> statement-breakpoint
ALTER TABLE `users` ADD `vk_token_expires_at` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `vk_user_id` varchar(32);
