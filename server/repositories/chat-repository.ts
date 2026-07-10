import { and, desc, eq, inArray } from "drizzle-orm";

import {
  chatRoomMembers,
  chatRooms,
  follows,
  messages,
  posts,
  users,
} from "../../drizzle/schema";
import { getDb } from "../db";

export type ChatUserRecord = typeof users.$inferSelect;
export type ChatMessageRecord = typeof messages.$inferSelect;

export interface ChatRepository {
  userExists(userId: number): Promise<boolean>;
  findUserById(userId: number): Promise<ChatUserRecord | undefined>;
  listMutualUsers(viewerUserId: number): Promise<ChatUserRecord[]>;
  areMutual(userAId: number, userBId: number): Promise<boolean>;
  findLatestPostImageStorageKey(userId: number): Promise<string | null>;
  findRoomIdForUsers(userAId: number, userBId: number): Promise<number | undefined>;
  createRoomForUsers(userAId: number, userBId: number): Promise<number>;
  listMessages(chatRoomId: number, limit: number): Promise<ChatMessageRecord[]>;
  findLatestMessage(chatRoomId: number): Promise<ChatMessageRecord | undefined>;
  insertMessage(chatRoomId: number, senderUserId: number, body: string): Promise<ChatMessageRecord>;
}

export class DrizzleChatRepository implements ChatRepository {
  async userExists(userId: number): Promise<boolean> {
    const db = await getDb();
    if (!db) throw new Error("Database is not available");

    const result = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
    return result.length > 0;
  }

  async findUserById(userId: number): Promise<ChatUserRecord | undefined> {
    const db = await getDb();
    if (!db) throw new Error("Database is not available");

    const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    return result[0];
  }

  async listMutualUsers(viewerUserId: number): Promise<ChatUserRecord[]> {
    const db = await getDb();
    if (!db) throw new Error("Database is not available");

    const followingRows = await db
      .select({ userId: follows.followingUserId })
      .from(follows)
      .where(eq(follows.followerUserId, viewerUserId));
    const followingIds = followingRows.map((row) => row.userId);
    if (followingIds.length === 0) return [];

    const mutualRows = await db
      .select({ user: users })
      .from(follows)
      .innerJoin(users, eq(follows.followerUserId, users.id))
      .where(
        and(
          eq(follows.followingUserId, viewerUserId),
          inArray(follows.followerUserId, followingIds),
        ),
      );

    return mutualRows.map((row) => row.user);
  }

  async areMutual(userAId: number, userBId: number): Promise<boolean> {
    const db = await getDb();
    if (!db) throw new Error("Database is not available");

    const aFollowsB = await db
      .select({ id: follows.id })
      .from(follows)
      .where(and(eq(follows.followerUserId, userAId), eq(follows.followingUserId, userBId)))
      .limit(1);
    if (aFollowsB.length === 0) return false;

    const bFollowsA = await db
      .select({ id: follows.id })
      .from(follows)
      .where(and(eq(follows.followerUserId, userBId), eq(follows.followingUserId, userAId)))
      .limit(1);

    return bFollowsA.length > 0;
  }

  async findLatestPostImageStorageKey(userId: number): Promise<string | null> {
    const db = await getDb();
    if (!db) throw new Error("Database is not available");

    const result = await db
      .select({ imageStorageKey: posts.imageStorageKey })
      .from(posts)
      .where(eq(posts.userId, userId))
      .orderBy(desc(posts.createdAt))
      .limit(1);

    return result[0]?.imageStorageKey ?? null;
  }

  async findRoomIdForUsers(userAId: number, userBId: number): Promise<number | undefined> {
    const db = await getDb();
    if (!db) throw new Error("Database is not available");

    const userARooms = await db
      .select({ chatRoomId: chatRoomMembers.chatRoomId })
      .from(chatRoomMembers)
      .where(eq(chatRoomMembers.userId, userAId));
    const roomIds = userARooms.map((row) => row.chatRoomId);
    if (roomIds.length === 0) return undefined;

    const userBRoom = await db
      .select({ chatRoomId: chatRoomMembers.chatRoomId })
      .from(chatRoomMembers)
      .where(and(eq(chatRoomMembers.userId, userBId), inArray(chatRoomMembers.chatRoomId, roomIds)))
      .limit(1);

    return userBRoom[0]?.chatRoomId;
  }

  async createRoomForUsers(userAId: number, userBId: number): Promise<number> {
    const db = await getDb();
    if (!db) throw new Error("Database is not available");

    const result = await db.insert(chatRooms).values({});
    const chatRoomId = Number(result[0].insertId);
    await db.insert(chatRoomMembers).values([
      { chatRoomId, userId: userAId },
      { chatRoomId, userId: userBId },
    ]);
    return chatRoomId;
  }

  async listMessages(chatRoomId: number, limit: number): Promise<ChatMessageRecord[]> {
    const db = await getDb();
    if (!db) throw new Error("Database is not available");

    const result = await db
      .select()
      .from(messages)
      .where(eq(messages.chatRoomId, chatRoomId))
      .orderBy(desc(messages.createdAt))
      .limit(limit);

    return result.reverse();
  }

  async findLatestMessage(chatRoomId: number): Promise<ChatMessageRecord | undefined> {
    const db = await getDb();
    if (!db) throw new Error("Database is not available");

    const result = await db
      .select()
      .from(messages)
      .where(eq(messages.chatRoomId, chatRoomId))
      .orderBy(desc(messages.createdAt))
      .limit(1);

    return result[0];
  }

  async insertMessage(chatRoomId: number, senderUserId: number, body: string): Promise<ChatMessageRecord> {
    const db = await getDb();
    if (!db) throw new Error("Database is not available");

    const result = await db.insert(messages).values({ chatRoomId, senderUserId, body });
    const messageId = Number(result[0].insertId);
    const inserted = await db.select().from(messages).where(eq(messages.id, messageId)).limit(1);
    if (!inserted[0]) throw new Error("Inserted message not found");
    return inserted[0];
  }
}
