CREATE TABLE `follows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`followerUserId` int NOT NULL,
	`followingUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `follows_id` PRIMARY KEY(`id`),
	CONSTRAINT `follows_follower_following_unique` UNIQUE(`followerUserId`,`followingUserId`)
);
--> statement-breakpoint
ALTER TABLE `follows` ADD CONSTRAINT `follows_followerUserId_users_id_fk` FOREIGN KEY (`followerUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `follows` ADD CONSTRAINT `follows_followingUserId_users_id_fk` FOREIGN KEY (`followingUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `follows_follower_user_id_idx` ON `follows` (`followerUserId`);--> statement-breakpoint
CREATE INDEX `follows_following_user_id_idx` ON `follows` (`followingUserId`);