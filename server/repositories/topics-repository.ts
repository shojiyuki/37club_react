import { asc, eq, gte } from "drizzle-orm";

import { topics } from "../../drizzle/schema";
import { getDb } from "../db";

export type TopicRecord = typeof topics.$inferSelect;
export type CreateTopicRecordInput = Pick<
  typeof topics.$inferInsert,
  "startAt" | "endAt" | "locationName" | "latitude" | "longitude" | "prompt"
>;

export interface TopicsRepository {
  findCurrentAndUpcoming(now: Date): Promise<TopicRecord[]>;
  findById(topicId: number): Promise<TopicRecord | undefined>;
  create(input: CreateTopicRecordInput): Promise<TopicRecord>;
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

  async create(input: CreateTopicRecordInput): Promise<TopicRecord> {
    const db = await getDb();
    if (!db) throw new Error("Database is not available");

    return db.transaction(async (tx) => {
      const insertedTopics = await tx
        .insert(topics)
        .values(input)
        .$returningId();
      const topicId = insertedTopics[0]?.id;
      if (!topicId) {
        throw new Error("Failed to create Topic");
      }

      const result = await tx
        .select()
        .from(topics)
        .where(eq(topics.id, topicId))
        .limit(1);
      const record = result[0];
      if (!record) {
        throw new Error("Failed to read created Topic");
      }

      return record;
    });
  }
}
