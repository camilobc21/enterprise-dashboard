ALTER TABLE `notifications` ADD `readAt` timestamp;--> statement-breakpoint
ALTER TABLE `notifications` DROP COLUMN `updatedAt`;