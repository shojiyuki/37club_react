import { and, eq } from "drizzle-orm";

import { participations, posts, topics, users } from "../../drizzle/schema";
import { getDb } from "../db";

export type CurrentTopicPostRecord = {
  post: typeof posts.$inferSelect;
  user: typeof users.$inferSelect;
  topic: typeof topics.$inferSelect;
};

export type MyCurrentPostRecord = {
  participation: typeof participations.$inferSelect;
  post: typeof posts.$inferSelect;
  topic: typeof topics.$inferSelect;
};

export interface PostsRepository {
  findActiveTopicIdByUserId(userId: number): Promise<number | undefined>;
  findCurrentTopicPosts(userId: number): Promise<CurrentTopicPostRecord[]>;
  findMyCurrentPost(userId: number): Promise<MyCurrentPostRecord | undefined>;
}

export class DrizzlePostsRepository implements PostsRepository {
  async findActiveTopicIdByUserId(userId: number): Promise<number | undefined> {
    const db = await getDb();
    if (!db) throw new Error("Database is not available");

    const result = await db
      .select({ topicId: participations.topicId })
      .from(participations)
      .where(and(eq(participations.userId, userId), eq(participations.status, "active")))
      .limit(1);

    return result.find((record) => record.topicId !== undefined)?.topicId;
  }

  async findCurrentTopicPosts(userId: number): Promise<CurrentTopicPostRecord[]> {
    const db = await getDb();
    if (!db) throw new Error("Database is not available");

    const topicId = await this.findActiveTopicIdByUserId(userId);
    if (!topicId) {
      return [];
    }

    return db
      .select({
        post: posts,
        user: users,
        topic: topics,
      })
      .from(posts)
      .innerJoin(users, eq(posts.userId, users.id))
      .innerJoin(topics, eq(posts.topicId, topics.id))
      .innerJoin(
        participations,
        and(
          eq(participations.postId, posts.id),
          eq(participations.status, "active"),
        ),
      )
      .where(eq(posts.topicId, topicId));
  }

  async findMyCurrentPost(userId: number): Promise<MyCurrentPostRecord | undefined> {
    const db = await getDb();
    if (!db) throw new Error("Database is not available");

    const result = await db
      .select({
        participation: participations,
        post: posts,
        topic: topics,
      })
      .from(participations)
      .innerJoin(posts, eq(participations.postId, posts.id))
      .innerJoin(topics, eq(participations.topicId, topics.id))
      .where(and(eq(participations.userId, userId), eq(participations.status, "active")))
      .limit(1);

    return result[0];
  }
}
