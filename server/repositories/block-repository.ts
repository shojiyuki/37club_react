import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";

import {
  chatRoomMembers,
  follows,
  userBlocks,
  users,
  type User,
  type UserBlock,
} from "../../drizzle/schema";
import { getDb } from "../db";

export type BlockedUserRecord = {
  block: UserBlock;
  user: User;
};

export interface BlockRepository {
  findAvailableUserById(userId: number): Promise<User | undefined>;
  findOutgoing(
    blockerUserId: number,
    blockedUserId: number,
  ): Promise<BlockedUserRecord | undefined>;
  listOutgoing(blockerUserId: number): Promise<BlockedUserRecord[]>;
  listCounterpartyUserIds(userId: number): Promise<number[]>;
  hasEitherDirection(userAId: number, userBId: number): Promise<boolean>;
  haveSharedChatRoom(userAId: number, userBId: number): Promise<boolean>;
  createAndRemoveFollows(
    blockerUserId: number,
    blockedUserId: number,
  ): Promise<BlockedUserRecord>;
  removeOutgoing(blockerUserId: number, blockedUserId: number): Promise<void>;
}

export class DrizzleBlockRepository implements BlockRepository {
  async findAvailableUserById(userId: number): Promise<User | undefined> {
    const db = await getDb();
    if (!db) throw new Error("Database is not available");

    const result = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.id, userId),
          isNull(users.suspendedAt),
          isNull(users.deletedAt),
        ),
      )
      .limit(1);
    return result[0];
  }

  async findOutgoing(
    blockerUserId: number,
    blockedUserId: number,
  ): Promise<BlockedUserRecord | undefined> {
    const db = await getDb();
    if (!db) throw new Error("Database is not available");

    const result = await db
      .select({ block: userBlocks, user: users })
      .from(userBlocks)
      .innerJoin(users, eq(userBlocks.blockedUserId, users.id))
      .where(
        and(
          eq(userBlocks.blockerUserId, blockerUserId),
          eq(userBlocks.blockedUserId, blockedUserId),
        ),
      )
      .limit(1);
    return result[0];
  }

  async listOutgoing(blockerUserId: number): Promise<BlockedUserRecord[]> {
    const db = await getDb();
    if (!db) throw new Error("Database is not available");

    return db
      .select({ block: userBlocks, user: users })
      .from(userBlocks)
      .innerJoin(users, eq(userBlocks.blockedUserId, users.id))
      .where(eq(userBlocks.blockerUserId, blockerUserId))
      .orderBy(desc(userBlocks.createdAt), desc(userBlocks.id));
  }

  async listCounterpartyUserIds(userId: number): Promise<number[]> {
    const db = await getDb();
    if (!db) throw new Error("Database is not available");

    const rows = await db
      .select({
        blockerUserId: userBlocks.blockerUserId,
        blockedUserId: userBlocks.blockedUserId,
      })
      .from(userBlocks)
      .where(
        or(
          eq(userBlocks.blockerUserId, userId),
          eq(userBlocks.blockedUserId, userId),
        ),
      );

    return [
      ...new Set(
        rows.map((row) =>
          row.blockerUserId === userId ? row.blockedUserId : row.blockerUserId,
        ),
      ),
    ];
  }

  async hasEitherDirection(userAId: number, userBId: number): Promise<boolean> {
    const db = await getDb();
    if (!db) throw new Error("Database is not available");

    const result = await db
      .select({ id: userBlocks.id })
      .from(userBlocks)
      .where(
        or(
          and(
            eq(userBlocks.blockerUserId, userAId),
            eq(userBlocks.blockedUserId, userBId),
          ),
          and(
            eq(userBlocks.blockerUserId, userBId),
            eq(userBlocks.blockedUserId, userAId),
          ),
        ),
      )
      .limit(1);
    return result.length > 0;
  }

  async haveSharedChatRoom(userAId: number, userBId: number): Promise<boolean> {
    const db = await getDb();
    if (!db) throw new Error("Database is not available");

    const userARooms = await db
      .select({ chatRoomId: chatRoomMembers.chatRoomId })
      .from(chatRoomMembers)
      .where(eq(chatRoomMembers.userId, userAId));
    const roomIds = userARooms.map((row) => row.chatRoomId);
    if (roomIds.length === 0) return false;

    const result = await db
      .select({ id: chatRoomMembers.id })
      .from(chatRoomMembers)
      .where(
        and(
          eq(chatRoomMembers.userId, userBId),
          inArray(chatRoomMembers.chatRoomId, roomIds),
        ),
      )
      .limit(1);

    return result.length > 0;
  }

  async createAndRemoveFollows(
    blockerUserId: number,
    blockedUserId: number,
  ): Promise<BlockedUserRecord> {
    const db = await getDb();
    if (!db) throw new Error("Database is not available");

    return db.transaction(async (tx) => {
      await tx
        .insert(userBlocks)
        .ignore()
        .values({ blockerUserId, blockedUserId });
      await tx
        .delete(follows)
        .where(
          or(
            and(
              eq(follows.followerUserId, blockerUserId),
              eq(follows.followingUserId, blockedUserId),
            ),
            and(
              eq(follows.followerUserId, blockedUserId),
              eq(follows.followingUserId, blockerUserId),
            ),
          ),
        );

      const result = await tx
        .select({ block: userBlocks, user: users })
        .from(userBlocks)
        .innerJoin(users, eq(userBlocks.blockedUserId, users.id))
        .where(
          and(
            eq(userBlocks.blockerUserId, blockerUserId),
            eq(userBlocks.blockedUserId, blockedUserId),
          ),
        )
        .limit(1);
      const record = result[0];
      if (!record) throw new Error("Failed to read created block");
      return record;
    });
  }

  async removeOutgoing(
    blockerUserId: number,
    blockedUserId: number,
  ): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database is not available");

    await db
      .delete(userBlocks)
      .where(
        and(
          eq(userBlocks.blockerUserId, blockerUserId),
          eq(userBlocks.blockedUserId, blockedUserId),
        ),
      );
  }
}
