CREATE TABLE `topics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`startAt` timestamp NOT NULL,
	`endAt` timestamp NOT NULL,
	`locationName` varchar(255) NOT NULL,
	`latitude` double NOT NULL,
	`longitude` double NOT NULL,
	`prompt` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `topics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `topics_start_at_idx` ON `topics` (`startAt`);--> statement-breakpoint
CREATE INDEX `topics_end_at_idx` ON `topics` (`endAt`);