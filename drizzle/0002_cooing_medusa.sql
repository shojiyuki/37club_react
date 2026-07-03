CREATE TABLE `posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`topicId` int NOT NULL,
	`imageStorageKey` varchar(1024) NOT NULL,
	`caption` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `posts_id` PRIMARY KEY(`id`),
	CONSTRAINT `posts_user_topic_unique` UNIQUE(`userId`,`topicId`)
);
--> statement-breakpoint
ALTER TABLE `posts` ADD CONSTRAINT `posts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `posts` ADD CONSTRAINT `posts_topicId_topics_id_fk` FOREIGN KEY (`topicId`) REFERENCES `topics`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `posts_user_id_idx` ON `posts` (`userId`);--> statement-breakpoint
CREATE INDEX `posts_topic_id_idx` ON `posts` (`topicId`);