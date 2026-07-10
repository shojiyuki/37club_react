import { and, eq } from "drizzle-orm";

import { follows, users } from "../../drizzle/schema";
import { getDb } from "../db";

export interface FollowRepository {
  userExists(userId: number): Promise<boolean>;
  isFollowing(followerUserId: number, followingUserId: number): Promise<boolean>;
  follow(followerUserId: number, followingUserId: number): Promise<void>;
  unfollow(followerUserId: number, followingUserId: number): Promise<void>;
}

export class DrizzleFollowRepository implements FollowRepository {
  async userExists(userId: number): Promise<boolean> {
    const db = await getDb();
    if (!db) throw new Error("Database is not available");

    const result = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
    return result.length > 0;
  }

  async isFollowing(followerUserId: number, followingUserId: number): Promise<boolean> {
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

    await db.insert(follows).ignore().values({ followerUserId, followingUserId });
  }

  async unfollow(followerUserId: number, followingUserId: number): Promise<void> {
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
}
