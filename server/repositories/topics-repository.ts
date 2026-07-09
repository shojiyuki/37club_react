import { asc, gte } from "drizzle-orm";

import { topics } from "../../drizzle/schema";
import { getDb } from "../db";

export type TopicRecord = typeof topics.$inferSelect;

export interface TopicsRepository {
  findCurrentAndUpcoming(now: Date): Promise<TopicRecord[]>;
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
}
