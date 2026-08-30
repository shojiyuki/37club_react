import { and, eq, isNull, sql } from "drizzle-orm";

import {
  chatRoomMembers,
  messages,
  posts,
  reports,
  users,
  type Report,
} from "../../drizzle/schema";
import { getDb } from "../db";

export type ReportTargetType = Report["targetType"];
export type ReportReason = Report["reason"];

export type ReportTarget = {
  targetType: ReportTargetType;
  targetId: number;
  targetUserId: number;
  topicId: number | null;
  chatRoomId: number | null;
};

export type CreateReportRecordInput = {
  reporterUserId: number;
  targetType: ReportTargetType;
  targetId: number;
  targetUserId: number;
  reason: ReportReason;
  details: string | null;
};

export interface ReportRepository {
  findExisting(
    reporterUserId: number,
    targetType: ReportTargetType,
    targetId: number,
  ): Promise<Report | undefined>;
  resolveTarget(
    targetType: ReportTargetType,
    targetId: number,
  ): Promise<ReportTarget | undefined>;
  isChatRoomMember(chatRoomId: number, userId: number): Promise<boolean>;
  create(input: CreateReportRecordInput): Promise<Report>;
}

type ResolvedTargetRow = {
  targetId: number;
  targetUserId: number;
  topicId: number | null;
  chatRoomId: number | null;
};

export class DrizzleReportRepository implements ReportRepository {
  async findExisting(
    reporterUserId: number,
    targetType: ReportTargetType,
    targetId: number,
  ): Promise<Report | undefined> {
    const db = await getDb();
    if (!db) throw new Error("Database is not available");

    const result = await db
      .select()
      .from(reports)
      .where(
        and(
          eq(reports.reporterUserId, reporterUserId),
          eq(reports.targetType, targetType),
          eq(reports.targetId, targetId),
        ),
      )
      .limit(1);
    return result[0];
  }

  async resolveTarget(
    targetType: ReportTargetType,
    targetId: number,
  ): Promise<ReportTarget | undefined> {
    const db = await getDb();
    if (!db) throw new Error("Database is not available");

    let row: ResolvedTargetRow | undefined;
    if (targetType === "post") {
      [row] = await db
        .select({
          targetId: posts.id,
          targetUserId: posts.userId,
          topicId: posts.topicId,
          chatRoomId: sql<null>`null`,
        })
        .from(posts)
        .innerJoin(users, eq(posts.userId, users.id))
        .where(
          and(
            eq(posts.id, targetId),
            isNull(posts.hiddenAt),
            isNull(users.suspendedAt),
            isNull(users.deletedAt),
          ),
        )
        .limit(1);
    } else if (targetType === "message") {
      [row] = await db
        .select({
          targetId: messages.id,
          targetUserId: messages.senderUserId,
          topicId: sql<null>`null`,
          chatRoomId: messages.chatRoomId,
        })
        .from(messages)
        .innerJoin(users, eq(messages.senderUserId, users.id))
        .where(
          and(
            eq(messages.id, targetId),
            isNull(messages.hiddenAt),
            isNull(users.suspendedAt),
            isNull(users.deletedAt),
          ),
        )
        .limit(1);
    } else {
      [row] = await db
        .select({
          targetId: users.id,
          targetUserId: users.id,
          topicId: sql<null>`null`,
          chatRoomId: sql<null>`null`,
        })
        .from(users)
        .where(
          and(
            eq(users.id, targetId),
            isNull(users.suspendedAt),
            isNull(users.deletedAt),
          ),
        )
        .limit(1);
    }

    return row ? { targetType, ...row } : undefined;
  }

  async isChatRoomMember(chatRoomId: number, userId: number): Promise<boolean> {
    const db = await getDb();
    if (!db) throw new Error("Database is not available");

    const result = await db
      .select({ id: chatRoomMembers.id })
      .from(chatRoomMembers)
      .where(
        and(
          eq(chatRoomMembers.chatRoomId, chatRoomId),
          eq(chatRoomMembers.userId, userId),
        ),
      )
      .limit(1);
    return result.length > 0;
  }

  async create(input: CreateReportRecordInput): Promise<Report> {
    const db = await getDb();
    if (!db) throw new Error("Database is not available");

    let reportId: number;
    try {
      const result = await db.insert(reports).values(input);
      reportId = Number(result[0].insertId);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        const existing = await this.findExisting(
          input.reporterUserId,
          input.targetType,
          input.targetId,
        );
        if (existing) return existing;
      }
      throw error;
    }

    const result = await db
      .select()
      .from(reports)
      .where(eq(reports.id, reportId))
      .limit(1);
    const created = result[0];
    if (!created) throw new Error("Failed to read created report");
    return created;
  }
}

function isDuplicateKeyError(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; current && depth < 3; depth += 1) {
    if (typeof current !== "object") return false;
    const candidate = current as {
      code?: unknown;
      errno?: unknown;
      cause?: unknown;
    };
    if (candidate.code === "ER_DUP_ENTRY" || candidate.errno === 1062) {
      return true;
    }
    current = candidate.cause;
  }
  return false;
}
