import { and, eq } from "drizzle-orm";
import { participations, posts, topics } from "../../drizzle/schema";
import { getDb } from "../db";

export type ActiveParticipationRecord = {
  participation: typeof participations.$inferSelect;
  topic: typeof topics.$inferSelect;
  post: typeof posts.$inferSelect;
};

export interface ParticipationRepository {
  findActiveByUserId(userId: number): Promise<ActiveParticipationRecord | undefined>;
  findTopicById(topicId: number): Promise<typeof topics.$inferSelect | undefined>;
  findPostByImageStorageKey(imageStorageKey: string): Promise<typeof posts.$inferSelect | undefined>;
  createActiveParticipation(input: {
    userId: number;
    topicId: number;
    imageStorageKey: string;
    caption: string;
  }): Promise<ActiveParticipationRecord>;
  markExpired(participationId: number): Promise<void>;
  markCheckedOut(participationId: number, checkedOutAt: Date): Promise<void>;
}

export class DrizzleParticipationRepository implements ParticipationRepository {
  async findActiveByUserId(userId: number): Promise<ActiveParticipationRecord | undefined> {
    const db = await getDb();
    if (!db) throw new Error("Database is not available");

    const result = await db
      .select({
        participation: participations,
        topic: topics,
        post: posts,
      })
      .from(participations)
      .innerJoin(topics, eq(participations.topicId, topics.id))
      .innerJoin(posts, eq(participations.postId, posts.id))
      .where(and(eq(participations.userId, userId), eq(participations.status, "active")))
      .limit(1);

    return result[0];
  }

  async findTopicById(topicId: number): Promise<typeof topics.$inferSelect | undefined> {
    const db = await getDb();
    if (!db) throw new Error("Database is not available");

    const result = await db.select().from(topics).where(eq(topics.id, topicId)).limit(1);
    return result[0];
  }

  async findPostByImageStorageKey(imageStorageKey: string): Promise<typeof posts.$inferSelect | undefined> {
    const db = await getDb();
    if (!db) throw new Error("Database is not available");

    const result = await db
      .select()
      .from(posts)
      .where(eq(posts.imageStorageKey, imageStorageKey))
      .limit(1);
    return result[0];
  }

  async createActiveParticipation(input: {
    userId: number;
    topicId: number;
    imageStorageKey: string;
    caption: string;
  }): Promise<ActiveParticipationRecord> {
    const db = await getDb();
    if (!db) throw new Error("Database is not available");

    const now = new Date();

    return db.transaction(async (tx) => {
      const insertedPosts = await tx
        .insert(posts)
        .values({
          userId: input.userId,
          topicId: input.topicId,
          imageStorageKey: input.imageStorageKey,
          caption: input.caption,
          createdAt: now,
          updatedAt: now,
        })
        .$returningId();
      const postId = insertedPosts[0]?.id;

      if (!postId) {
        throw new Error("Failed to create post");
      }

      const insertedParticipations = await tx
        .insert(participations)
        .values({
          userId: input.userId,
          topicId: input.topicId,
          postId,
          status: "active",
          checkedInAt: now,
          createdAt: now,
          updatedAt: now,
        })
        .$returningId();
      const participationId = insertedParticipations[0]?.id;

      if (!participationId) {
        throw new Error("Failed to create participation");
      }

      const result = await tx
        .select({
          participation: participations,
          topic: topics,
          post: posts,
        })
        .from(participations)
        .innerJoin(topics, eq(participations.topicId, topics.id))
        .innerJoin(posts, eq(participations.postId, posts.id))
        .where(eq(participations.id, participationId))
        .limit(1);
      const record = result[0];

      if (!record) {
        throw new Error("Failed to read created participation");
      }

      return record;
    });
  }

  async markExpired(participationId: number): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database is not available");

    await db
      .update(participations)
      .set({ status: "expired" })
      .where(and(eq(participations.id, participationId), eq(participations.status, "active")));
  }

  async markCheckedOut(participationId: number, checkedOutAt: Date): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database is not available");

    await db
      .update(participations)
      .set({ status: "checked_out", checkedOutAt })
      .where(and(eq(participations.id, participationId), eq(participations.status, "active")));
  }
}
