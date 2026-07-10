CREATE TABLE `chatRoomMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`chatRoomId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chatRoomMembers_id` PRIMARY KEY(`id`),
	CONSTRAINT `chat_room_members_room_user_unique` UNIQUE(`chatRoomId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `chatRooms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chatRooms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`chatRoomId` int NOT NULL,
	`senderUserId` int NOT NULL,
	`body` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `chatRoomMembers` ADD CONSTRAINT `chatRoomMembers_chatRoomId_chatRooms_id_fk` FOREIGN KEY (`chatRoomId`) REFERENCES `chatRooms`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chatRoomMembers` ADD CONSTRAINT `chatRoomMembers_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `messages` ADD CONSTRAINT `messages_chatRoomId_chatRooms_id_fk` FOREIGN KEY (`chatRoomId`) REFERENCES `chatRooms`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `messages` ADD CONSTRAINT `messages_senderUserId_users_id_fk` FOREIGN KEY (`senderUserId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `chat_room_members_room_id_idx` ON `chatRoomMembers` (`chatRoomId`);--> statement-breakpoint
CREATE INDEX `chat_room_members_user_id_idx` ON `chatRoomMembers` (`userId`);--> statement-breakpoint
CREATE INDEX `messages_room_created_at_idx` ON `messages` (`chatRoomId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `messages_sender_user_id_idx` ON `messages` (`senderUserId`);