import { asc, desc, eq, gte } from "drizzle-orm";

import { topics } from "../../drizzle/schema";
import { getDb } from "../db";

export type TopicRecord = typeof topics.$inferSelect;
export type CreateTopicRecordInput = Pick<
  typeof topics.$inferInsert,
  "startAt" | "endAt" | "locationName" | "latitude" | "longitude" | "prompt"
>;
export type UpdateTopicRecordInput = Partial<CreateTopicRecordInput>;
export type UpdateTopicRecordResult = {
  before: TopicRecord;
  after: TopicRecord;
};

export interface TopicsRepository {
  findCurrentAndUpcoming(now: Date): Promise<TopicRecord[]>;
  findAll(): Promise<TopicRecord[]>;
  findById(topicId: number): Promise<TopicRecord | undefined>;
  create(input: CreateTopicRecordInput): Promise<TopicRecord>;
  update(
    topicId: number,
    changes: UpdateTopicRecordInput,
  ): Promise<UpdateTopicRecordResult | undefined>;
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

  async findAll(): Promise<TopicRecord[]> {
    const db = await getDb();
    if (!db) throw new Error("Database is not available");

    return db.select().from(topics).orderBy(desc(topics.startAt));
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

  async update(
    topicId: number,
    changes: UpdateTopicRecordInput,
  ): Promise<UpdateTopicRecordResult | undefined> {
    const db = await getDb();
    if (!db) throw new Error("Database is not available");

    return db.transaction(async (tx) => {
      const existingRecords = await tx
        .select()
        .from(topics)
        .where(eq(topics.id, topicId))
        .limit(1);
      const before = existingRecords[0];
      if (!before) {
        return undefined;
      }

      await tx.update(topics).set(changes).where(eq(topics.id, topicId));

      const updatedRecords = await tx
        .select()
        .from(topics)
        .where(eq(topics.id, topicId))
        .limit(1);
      const after = updatedRecords[0];
      if (!after) {
        throw new Error("Failed to read updated Topic");
      }

      return { before, after };
    });
  }
}
