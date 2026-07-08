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
