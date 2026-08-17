ALTER TABLE `ai_provider_configs` ADD `isActive` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `ai_provider_configs` ADD COLUMN IF NOT EXISTS `isActive` boolean NOT NULL DEFAULT false;--> statement-breakpoint
UPDATE `ai_provider_configs` SET `isActive` = true WHERE `configKey` = 'global';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `ai_provider_configs_isActive_idx` ON `ai_provider_configs` (`isActive`);
