import { asc, eq } from "drizzle-orm";

import { appReviewConfig, type AppReviewConfig } from "../../drizzle/schema";
import { getDb } from "../db";

export interface AppReviewConfigRepository {
  findAll(): Promise<AppReviewConfig[]>;
  findByTopicId(topicId: number): Promise<AppReviewConfig | undefined>;
}

export const noAppReviewConfigRepository: AppReviewConfigRepository = {
  async findAll() {
    return [];
  },
  async findByTopicId() {
    return undefined;
  },
};

export class DrizzleAppReviewConfigRepository implements AppReviewConfigRepository {
  async findAll(): Promise<AppReviewConfig[]> {
    const db = await getDb();
    if (!db) throw new Error("Database is not available");

    return db
      .select()
      .from(appReviewConfig)
      .orderBy(asc(appReviewConfig.topicId));
  }

  async findByTopicId(topicId: number): Promise<AppReviewConfig | undefined> {
    const db = await getDb();
    if (!db) throw new Error("Database is not available");

    const result = await db
      .select()
      .from(appReviewConfig)
      .where(eq(appReviewConfig.topicId, topicId))
      .limit(1);

    return result[0];
  }
}
