CREATE TABLE `wifi_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`scanId` int,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`tipo` enum('saturacion','perdida','ocupacion','interferencia','anomalia') NOT NULL,
	`descripcion` text NOT NULL,
	`severidad` enum('info','warning','critical') NOT NULL DEFAULT 'warning',
	`resuelta` boolean NOT NULL DEFAULT false,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wifi_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wifi_channels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scanId` int NOT NULL,
	`canal` int NOT NULL,
	`saturacion` decimal(5,2) NOT NULL,
	`ocupacionEspectral` decimal(5,2) NOT NULL,
	`interferencia` decimal(5,2),
	`perdidaPaquetes` decimal(5,2),
	`riesgoAnomalia` decimal(5,2),
	`rssi` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wifi_channels_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wifi_predictions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`saturacionPredicha` decimal(5,2) NOT NULL,
	`riesgoAnomalia` decimal(5,2) NOT NULL,
	`canalOptimoPredicho` int,
	`analisisPrediccion` text,
	`confianza` decimal(5,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wifi_predictions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wifi_scans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`saturacionGeneral` decimal(5,2) NOT NULL,
	`ocupacionEspectral` decimal(5,2) NOT NULL,
	`perdidaPaquetes` decimal(5,2) NOT NULL,
	`totalRedes` int NOT NULL,
	`tendenciaIA` decimal(5,2),
	`canalOptimo` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wifi_scans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `wifi_alerts` ADD CONSTRAINT `wifi_alerts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wifi_alerts` ADD CONSTRAINT `wifi_alerts_scanId_wifi_scans_id_fk` FOREIGN KEY (`scanId`) REFERENCES `wifi_scans`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wifi_channels` ADD CONSTRAINT `wifi_channels_scanId_wifi_scans_id_fk` FOREIGN KEY (`scanId`) REFERENCES `wifi_scans`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wifi_predictions` ADD CONSTRAINT `wifi_predictions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wifi_scans` ADD CONSTRAINT `wifi_scans_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `wifi_alerts_userId_idx` ON `wifi_alerts` (`userId`);--> statement-breakpoint
CREATE INDEX `wifi_alerts_timestamp_idx` ON `wifi_alerts` (`timestamp`);--> statement-breakpoint
CREATE INDEX `wifi_channels_scanId_idx` ON `wifi_channels` (`scanId`);--> statement-breakpoint
CREATE INDEX `wifi_channels_canal_idx` ON `wifi_channels` (`canal`);--> statement-breakpoint
CREATE INDEX `wifi_predictions_userId_idx` ON `wifi_predictions` (`userId`);--> statement-breakpoint
CREATE INDEX `wifi_predictions_timestamp_idx` ON `wifi_predictions` (`timestamp`);--> statement-breakpoint
CREATE INDEX `wifi_scans_userId_idx` ON `wifi_scans` (`userId`);--> statement-breakpoint
CREATE INDEX `wifi_scans_timestamp_idx` ON `wifi_scans` (`timestamp`);