import { asc, eq, gte } from "drizzle-orm";

import { topics } from "../../drizzle/schema";
import { getDb } from "../db";

export type TopicRecord = typeof topics.$inferSelect;

export interface TopicsRepository {
  findCurrentAndUpcoming(now: Date): Promise<TopicRecord[]>;
  findById(topicId: number): Promise<TopicRecord | undefined>;
}

export class DrizzleTopicsRepository implements TopicsRepository {
  async findCurrentAndUpcoming(now: Date): Promise<TopicRecord[]> {
    const db = await getDb();
    if (!db) throw new Error("Database is not available");

    return db
      .select()
      .from(topics)
      .where(gte(topics.endAt, now))
      .orderBy(asc(topics.startAt));
  }

  async findById(topicId: number): Promise<TopicRecord | undefined> {
    const db = await getDb();
    if (!db) throw new Error("Database is not available");

    const result = await db
      .select()
      .from(topics)
      .where(eq(topics.id, topicId))
      .limit(1);
    return result[0];
  }
}
