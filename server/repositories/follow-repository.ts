import { and, eq, isNull } from "drizzle-orm";

import { follows, participations, users } from "../../drizzle/schema";
import { getDb } from "../db";

export interface FollowRepository {
  userExists(userId: number): Promise<boolean>;
  areActiveInSameTopic(userAId: number, userBId: number): Promise<boolean>;
  isFollowing(
    followerUserId: number,
    followingUserId: number,
  ): Promise<boolean>;
  follow(followerUserId: number, followingUserId: number): Promise<void>;
  unfollow(followerUserId: number, followingUserId: number): Promise<void>;
}

export class DrizzleFollowRepository implements FollowRepository {
  async userExists(userId: number): Promise<boolean> {
    const db = await getDb();
    if (!db) throw new Error("Database is not available");

    const result = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.id, userId),
          isNull(users.suspendedAt),
          isNull(users.deletedAt),
        ),
      )
      .limit(1);
    return result.length > 0;
  }

  async areActiveInSameTopic(
    userAId: number,
    userBId: number,
  ): Promise<boolean> {
    const userATopicId = await this.findActiveTopicIdByUserId(userAId);
    if (!userATopicId) {
      return false;
    }

    const db = await getDb();
    if (!db) throw new Error("Database is not available");

    const result = await db
      .select({ id: participations.id })
      .from(participations)
      .where(
        and(
          eq(participations.userId, userBId),
          eq(participations.topicId, userATopicId),
          eq(participations.status, "active"),
        ),
      )
      .limit(1);

    return result.length > 0;
  }

  async isFollowing(
    followerUserId: number,
    followingUserId: number,
  ): Promise<boolean> {
    const db = await getDb();
    if (!db) throw new Error("Database is not available");

    const result = await db
      .select({ id: follows.id })
      .from(follows)
      .where(
        and(
          eq(follows.followerUserId, followerUserId),
          eq(follows.followingUserId, followingUserId),
        ),
      )
      .limit(1);

    return result.length > 0;
  }

  async follow(followerUserId: number, followingUserId: number): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database is not available");

    await db
      .insert(follows)
      .ignore()
      .values({ followerUserId, followingUserId });
  }

  async unfollow(
    followerUserId: number,
    followingUserId: number,
  ): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database is not available");

    await db
      .delete(follows)
      .where(
        and(
          eq(follows.followerUserId, followerUserId),
          eq(follows.followingUserId, followingUserId),
        ),
      );
  }

  private async findActiveTopicIdByUserId(
    userId: number,
  ): Promise<number | undefined> {
    const db = await getDb();
    if (!db) throw new Error("Database is not available");

    const result = await db
      .select({ topicId: participations.topicId })
      .from(participations)
      .where(
        and(
          eq(participations.userId, userId),
          eq(participations.status, "active"),
        ),
      )
      .limit(1);

    return result[0]?.topicId;
  }
}
