CREATE TABLE `wifi_networks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scanId` int NOT NULL,
	`ssid` varchar(255),
	`bssid` varchar(24),
	`canal` int NOT NULL,
	`rssi` int NOT NULL,
	`encriptacion` varchar(80),
	`oculto` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wifi_networks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `wifi_networks` ADD CONSTRAINT `wifi_networks_scanId_wifi_scans_id_fk` FOREIGN KEY (`scanId`) REFERENCES `wifi_scans`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `wifi_networks_scanId_idx` ON `wifi_networks` (`scanId`);--> statement-breakpoint
CREATE INDEX `wifi_networks_canal_idx` ON `wifi_networks` (`canal`);