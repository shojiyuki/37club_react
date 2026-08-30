DELETE FROM `reports` WHERE `targetType` = 'post_comment';--> statement-breakpoint
DROP TABLE `postComments`;--> statement-breakpoint
ALTER TABLE `reports` MODIFY COLUMN `targetType` enum('post','message','user') NOT NULL;
