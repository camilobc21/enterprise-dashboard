CREATE TABLE `ai_provider_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`configKey` varchar(32) NOT NULL,
	`providerName` varchar(100) NOT NULL,
	`baseUrl` varchar(500) NOT NULL,
	`model` varchar(160) NOT NULL,
	`encryptedApiKey` text NOT NULL,
	`updatedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_provider_configs_id` PRIMARY KEY(`id`),
	CONSTRAINT `ai_provider_configs_configKey_unique` UNIQUE(`configKey`)
);
--> statement-breakpoint
ALTER TABLE `ai_provider_configs` ADD CONSTRAINT `ai_provider_configs_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;