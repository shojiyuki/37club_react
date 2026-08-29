import {
  boolean,
  double,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Legacy nullable provider identifier. New auth identities live in auth_accounts. */
  openId: varchar("openId", { length: 64 }).unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  suspendedAt: timestamp("suspendedAt"),
  deletedAt: timestamp("deletedAt"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const authAccounts = mysqlTable(
  "auth_accounts",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 64 }).notNull(),
    issuer: varchar("issuer", { length: 255 }).notNull(),
    subject: varchar("subject", { length: 255 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("auth_accounts_issuer_subject_unique").on(
      table.issuer,
      table.subject,
    ),
    index("auth_accounts_user_id_idx").on(table.userId),
  ],
);

export type AuthAccount = typeof authAccounts.$inferSelect;
export type InsertAuthAccount = typeof authAccounts.$inferInsert;

export const follows = mysqlTable(
  "follows",
  {
    id: int("id").autoincrement().primaryKey(),
    followerUserId: int("followerUserId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followingUserId: int("followingUserId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("follows_follower_following_unique").on(
      table.followerUserId,
      table.followingUserId,
    ),
    index("follows_follower_user_id_idx").on(table.followerUserId),
    index("follows_following_user_id_idx").on(table.followingUserId),
  ],
);

export type Follow = typeof follows.$inferSelect;
export type InsertFollow = typeof follows.$inferInsert;

export const chatRooms = mysqlTable("chatRooms", {
  id: int("id").autoincrement().primaryKey(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ChatRoom = typeof chatRooms.$inferSelect;
export type InsertChatRoom = typeof chatRooms.$inferInsert;

export const chatRoomMembers = mysqlTable(
  "chatRoomMembers",
  {
    id: int("id").autoincrement().primaryKey(),
    chatRoomId: int("chatRoomId")
      .notNull()
      .references(() => chatRooms.id, { onDelete: "cascade" }),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("chat_room_members_room_user_unique").on(
      table.chatRoomId,
      table.userId,
    ),
    index("chat_room_members_room_id_idx").on(table.chatRoomId),
    index("chat_room_members_user_id_idx").on(table.userId),
  ],
);

export type ChatRoomMember = typeof chatRoomMembers.$inferSelect;
export type InsertChatRoomMember = typeof chatRoomMembers.$inferInsert;

export const messages = mysqlTable(
  "messages",
  {
    id: int("id").autoincrement().primaryKey(),
    chatRoomId: int("chatRoomId")
      .notNull()
      .references(() => chatRooms.id, { onDelete: "cascade" }),
    senderUserId: int("senderUserId")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    body: text("body").notNull(),
    hiddenAt: timestamp("hiddenAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("messages_room_created_at_idx").on(table.chatRoomId, table.createdAt),
    index("messages_sender_user_id_idx").on(table.senderUserId),
  ],
);

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

export const topics = mysqlTable(
  "topics",
  {
    id: int("id").autoincrement().primaryKey(),
    startAt: timestamp("startAt").notNull(),
    endAt: timestamp("endAt").notNull(),
    locationName: varchar("locationName", { length: 255 }).notNull(),
    latitude: double("latitude").notNull(),
    longitude: double("longitude").notNull(),
    prompt: text("prompt").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("topics_start_at_idx").on(table.startAt),
    index("topics_end_at_idx").on(table.endAt),
  ],
);

export type Topic = typeof topics.$inferSelect;
export type InsertTopic = typeof topics.$inferInsert;

export const appReviewConfig = mysqlTable("app_review_config", {
  enabled: boolean("enabled").default(false).notNull(),
  topicId: int("topicId")
    .primaryKey()
    .references(() => topics.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AppReviewConfig = typeof appReviewConfig.$inferSelect;
export type InsertAppReviewConfig = typeof appReviewConfig.$inferInsert;

export const posts = mysqlTable(
  "posts",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    topicId: int("topicId")
      .notNull()
      .references(() => topics.id, { onDelete: "restrict" }),
    imageStorageKey: varchar("imageStorageKey", { length: 1024 }).notNull(),
    caption: text("caption").notNull(),
    hiddenAt: timestamp("hiddenAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("posts_user_topic_unique").on(table.userId, table.topicId),
    index("posts_user_id_idx").on(table.userId),
    index("posts_topic_id_idx").on(table.topicId),
  ],
);

export type Post = typeof posts.$inferSelect;
export type InsertPost = typeof posts.$inferInsert;

export const postComments = mysqlTable(
  "postComments",
  {
    id: int("id").autoincrement().primaryKey(),
    postId: int("postId")
      .notNull()
      .references(() => posts.id, { onDelete: "restrict" }),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    body: text("body").notNull(),
    hiddenAt: timestamp("hiddenAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    index("post_comments_post_created_id_idx").on(
      table.postId,
      table.createdAt,
      table.id,
    ),
  ],
);

export type PostComment = typeof postComments.$inferSelect;
export type InsertPostComment = typeof postComments.$inferInsert;

export const reports = mysqlTable(
  "reports",
  {
    id: int("id").autoincrement().primaryKey(),
    reporterUserId: int("reporterUserId")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    targetType: mysqlEnum("targetType", [
      "post",
      "post_comment",
      "message",
      "user",
    ])
      .notNull(),
    targetId: int("targetId").notNull(),
    targetUserId: int("targetUserId")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    reason: mysqlEnum("reason", [
      "spam",
      "harassment",
      "sexual_content",
      "violence",
      "personal_information",
      "impersonation",
      "other",
    ])
      .notNull(),
    details: text("details"),
    status: mysqlEnum("status", ["pending", "action_taken", "dismissed"])
      .default("pending")
      .notNull(),
    reviewedAt: timestamp("reviewedAt"),
    reviewedByUserId: int("reviewedByUserId").references(() => users.id, {
      onDelete: "restrict",
    }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("reports_reporter_target_unique").on(
      table.reporterUserId,
      table.targetType,
      table.targetId,
    ),
    index("reports_status_created_at_idx").on(table.status, table.createdAt),
    index("reports_target_idx").on(table.targetType, table.targetId),
    index("reports_target_user_created_at_idx").on(
      table.targetUserId,
      table.createdAt,
    ),
  ],
);

export const userBlocks = mysqlTable(
  "userBlocks",
  {
    id: int("id").autoincrement().primaryKey(),
    blockerUserId: int("blockerUserId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    blockedUserId: int("blockedUserId")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("user_blocks_blocker_blocked_unique").on(
      table.blockerUserId,
      table.blockedUserId,
    ),
    index("user_blocks_blocked_blocker_idx").on(
      table.blockedUserId,
      table.blockerUserId,
    ),
  ],
);

export type Report = typeof reports.$inferSelect;
export type InsertReport = typeof reports.$inferInsert;
export type UserBlock = typeof userBlocks.$inferSelect;
export type InsertUserBlock = typeof userBlocks.$inferInsert;

export const participations = mysqlTable(
  "participations",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    topicId: int("topicId")
      .notNull()
      .references(() => topics.id, { onDelete: "restrict" }),
    postId: int("postId")
      .notNull()
      .references(() => posts.id, { onDelete: "restrict" }),
    status: mysqlEnum("status", ["active", "checked_out", "expired"])
      .default("active")
      .notNull(),
    checkedInAt: timestamp("checkedInAt").defaultNow().notNull(),
    checkedOutAt: timestamp("checkedOutAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("participations_user_topic_unique").on(
      table.userId,
      table.topicId,
    ),
    uniqueIndex("participations_post_id_unique").on(table.postId),
    index("participations_user_status_idx").on(table.userId, table.status),
    index("participations_topic_status_idx").on(table.topicId, table.status),
  ],
);

export type Participation = typeof participations.$inferSelect;
export type InsertParticipation = typeof participations.$inferInsert;
