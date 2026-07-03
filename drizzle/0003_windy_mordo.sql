CREATE TABLE `participations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`topicId` int NOT NULL,
	`postId` int NOT NULL,
	`status` enum('active','checked_out','expired') NOT NULL DEFAULT 'active',
	`checkedInAt` timestamp NOT NULL DEFAULT (now()),
	`checkedOutAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `participations_id` PRIMARY KEY(`id`),
	CONSTRAINT `participations_user_topic_unique` UNIQUE(`userId`,`topicId`),
	CONSTRAINT `participations_post_id_unique` UNIQUE(`postId`)
);
--> statement-breakpoint
ALTER TABLE `participations` ADD CONSTRAINT `participations_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `participations` ADD CONSTRAINT `participations_topicId_topics_id_fk` FOREIGN KEY (`topicId`) REFERENCES `topics`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `participations` ADD CONSTRAINT `participations_postId_posts_id_fk` FOREIGN KEY (`postId`) REFERENCES `posts`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `participations_user_status_idx` ON `participations` (`userId`,`status`);--> statement-breakpoint
CREATE INDEX `participations_topic_status_idx` ON `participations` (`topicId`,`status`);