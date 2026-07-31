CREATE TABLE `app_review_config` (
	`enabled` boolean NOT NULL DEFAULT false,
	`topicId` int NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `app_review_config_topicId` PRIMARY KEY(`topicId`)
);
--> statement-breakpoint
ALTER TABLE `app_review_config` ADD CONSTRAINT `app_review_config_topicId_topics_id_fk` FOREIGN KEY (`topicId`) REFERENCES `topics`(`id`) ON DELETE cascade ON UPDATE no action;
