CREATE TABLE `network_devices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`displayName` varchar(160) NOT NULL,
	`ipAddress` varchar(45),
	`macAddress` varchar(32) NOT NULL,
	`vendor` varchar(160),
	`deviceType` enum('unknown','computer','phone','tablet','iot','printer','router','camera','server') NOT NULL DEFAULT 'unknown',
	`status` enum('online','offline','unknown') NOT NULL DEFAULT 'unknown',
	`isTrusted` boolean NOT NULL DEFAULT false,
	`source` enum('manual','router_dhcp','router_arp','esp32') NOT NULL DEFAULT 'manual',
	`firstSeen` timestamp NOT NULL DEFAULT (now()),
	`lastSeen` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `network_devices_id` PRIMARY KEY(`id`),
	CONSTRAINT `network_devices_owner_mac_unique` UNIQUE(`ownerId`,`macAddress`)
);
--> statement-breakpoint
ALTER TABLE `network_devices` ADD CONSTRAINT `network_devices_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `network_devices_ownerId_idx` ON `network_devices` (`ownerId`);--> statement-breakpoint
CREATE INDEX `network_devices_lastSeen_idx` ON `network_devices` (`lastSeen`);