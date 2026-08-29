CREATE TABLE `reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reporterUserId` int NOT NULL,
	`targetType` enum('post','post_comment','message','user') NOT NULL,
	`targetId` int NOT NULL,
	`targetUserId` int NOT NULL,
	`reason` enum('spam','harassment','sexual_content','violence','personal_information','impersonation','other') NOT NULL,
	`details` text,
	`status` enum('pending','action_taken','dismissed') NOT NULL DEFAULT 'pending',
	`reviewedAt` timestamp,
	`reviewedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reports_id` PRIMARY KEY(`id`),
	CONSTRAINT `reports_reporter_target_unique` UNIQUE(`reporterUserId`,`targetType`,`targetId`)
);
--> statement-breakpoint
CREATE TABLE `userBlocks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`blockerUserId` int NOT NULL,
	`blockedUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `userBlocks_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_blocks_blocker_blocked_unique` UNIQUE(`blockerUserId`,`blockedUserId`)
);
--> statement-breakpoint
ALTER TABLE `messages` ADD `hiddenAt` timestamp;--> statement-breakpoint
ALTER TABLE `postComments` ADD `hiddenAt` timestamp;--> statement-breakpoint
ALTER TABLE `posts` ADD `hiddenAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `suspendedAt` timestamp;--> statement-breakpoint
ALTER TABLE `reports` ADD CONSTRAINT `reports_reporterUserId_users_id_fk` FOREIGN KEY (`reporterUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reports` ADD CONSTRAINT `reports_targetUserId_users_id_fk` FOREIGN KEY (`targetUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reports` ADD CONSTRAINT `reports_reviewedByUserId_users_id_fk` FOREIGN KEY (`reviewedByUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userBlocks` ADD CONSTRAINT `userBlocks_blockerUserId_users_id_fk` FOREIGN KEY (`blockerUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userBlocks` ADD CONSTRAINT `userBlocks_blockedUserId_users_id_fk` FOREIGN KEY (`blockedUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `reports_status_created_at_idx` ON `reports` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `reports_target_idx` ON `reports` (`targetType`,`targetId`);--> statement-breakpoint
CREATE INDEX `reports_target_user_created_at_idx` ON `reports` (`targetUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `user_blocks_blocked_blocker_idx` ON `userBlocks` (`blockedUserId`,`blockerUserId`);