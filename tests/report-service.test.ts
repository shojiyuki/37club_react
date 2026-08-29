import { describe, expect, it, vi } from "vitest";

import type {
  AppReviewConfig,
  Participation,
  Post,
  Report,
  Topic,
} from "../drizzle/schema";
import type { AppReviewConfigRepository } from "../server/repositories/app-review-config-repository";
import type { BlockRepository } from "../server/repositories/block-repository";
import type { ChatRepository } from "../server/repositories/chat-repository";
import type {
  ActiveParticipationRecord,
  ParticipationRepository,
} from "../server/repositories/participation-repository";
import type {
  ReportRepository,
  ReportTarget,
} from "../server/repositories/report-repository";
import {
  ReportService,
  ReportServiceError,
} from "../server/services/report-service";

const NOW = new Date("2026-08-29T00:10:00.000Z");
const EXPIRED_CHECK_IN = new Date("2026-08-28T23:32:00.000Z");
const validInput = {
  targetType: "post" as const,
  targetId: 10,
  reason: "spam" as const,
};

function createReport(overrides: Partial<Report> = {}): Report {
  return {
    id: 30,
    reporterUserId: 1,
    targetType: "post",
    targetId: 10,
    targetUserId: 2,
    reason: "spam",
    details: null,
    status: "pending",
    reviewedAt: null,
    reviewedByUserId: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function createTarget(
  targetType: ReportTarget["targetType"],
  targetUserId = 2,
): ReportTarget {
  return {
    targetType,
    targetId: 10,
    targetUserId,
    topicId: targetType === "post" || targetType === "post_comment" ? 20 : null,
    chatRoomId: targetType === "message" ? 5 : null,
  };
}

function createReportRepository(
  overrides: Partial<ReportRepository> = {},
): ReportRepository {
  return {
    findExisting: vi.fn().mockResolvedValue(undefined),
    resolveTarget: vi.fn().mockResolvedValue(createTarget("post")),
    isChatRoomMember: vi.fn().mockResolvedValue(true),
    create: vi.fn().mockImplementation(async (input) => createReport(input)),
    ...overrides,
  };
}

function createActiveRecord(input: {
  userId: number;
  topicId: number;
  checkedInAt?: Date;
}): ActiveParticipationRecord {
  const checkedInAt = input.checkedInAt ?? NOW;
  const participation: Participation = {
    id: input.userId,
    userId: input.userId,
    topicId: input.topicId,
    postId: input.userId,
    status: "active",
    checkedInAt,
    checkedOutAt: null,
    createdAt: checkedInAt,
    updatedAt: checkedInAt,
  };
  const topic: Topic = {
    id: input.topicId,
    startAt: new Date("2026-08-28T00:00:00.000Z"),
    endAt: new Date("2026-08-30T00:00:00.000Z"),
    locationName: "test",
    latitude: 35,
    longitude: 139,
    prompt: "test prompt",
    createdAt: NOW,
    updatedAt: NOW,
  };
  const post: Post = {
    id: input.userId,
    userId: input.userId,
    topicId: input.topicId,
    imageStorageKey: `users/${input.userId}/posts/test.jpg`,
    caption: "test",
    hiddenAt: null,
    createdAt: NOW,
    updatedAt: NOW,
  };
  return { participation, topic, post };
}

function createParticipationRepository(input: {
  reporterTopicId?: number;
  targetTopicId?: number;
  expiredDemo?: boolean;
}): ParticipationRepository {
  const records = new Map<number, ActiveParticipationRecord>([
    [
      1,
      createActiveRecord({
        userId: 1,
        topicId: input.reporterTopicId ?? 20,
        checkedInAt: input.expiredDemo ? EXPIRED_CHECK_IN : NOW,
      }),
    ],
    [
      2,
      createActiveRecord({
        userId: 2,
        topicId: input.targetTopicId ?? 20,
      }),
    ],
  ]);
  return {
    findActiveByUserId: vi
      .fn()
      .mockImplementation(async (userId: number) => records.get(userId)),
    findByUserIdAndTopicId: vi.fn(),
    findTopicById: vi.fn(),
    findPostByImageStorageKey: vi.fn(),
    createActiveParticipation: vi.fn(),
    reactivateParticipation: vi.fn(),
    markExpired: vi.fn(),
    markCheckedOut: vi.fn(),
  };
}

function createAppReviewConfigRepository(): AppReviewConfigRepository {
  const config: AppReviewConfig = {
    enabled: true,
    topicId: 20,
    expiresAt: new Date("2026-08-30T00:00:00.000Z"),
    createdAt: NOW,
    updatedAt: NOW,
  };
  return {
    findAll: vi.fn().mockResolvedValue([config]),
    findByTopicId: vi.fn().mockResolvedValue(config),
  };
}

function createBlockRepository(input: {
  blocked?: boolean;
  sharedRoom?: boolean;
}): BlockRepository {
  return {
    findAvailableUserById: vi.fn(),
    findOutgoing: vi.fn(),
    listOutgoing: vi.fn(),
    listCounterpartyUserIds: vi.fn(),
    hasEitherDirection: vi.fn().mockResolvedValue(input.blocked ?? false),
    haveSharedChatRoom: vi.fn().mockResolvedValue(input.sharedRoom ?? false),
    createAndRemoveFollows: vi.fn(),
    removeOutgoing: vi.fn(),
  };
}

function createChatRepository(input: { mutual?: boolean }): ChatRepository {
  return {
    userExists: vi.fn(),
    findUserById: vi.fn(),
    listMutualUsers: vi.fn(),
    areMutual: vi.fn().mockResolvedValue(input.mutual ?? true),
    areActiveInSameTopic: vi.fn(),
    findLatestPostImageStorageKey: vi.fn(),
    findRoomIdForUsers: vi.fn(),
    createRoomForUsers: vi.fn(),
    listMessages: vi.fn(),
    findLatestMessage: vi.fn(),
    insertMessage: vi.fn(),
  };
}

function createReportService(
  input: {
    reports?: ReportRepository;
    targetUserId?: number;
    blocked?: boolean;
    sharedRoom?: boolean;
    roomMember?: boolean;
    mutual?: boolean;
    reporterTopicId?: number;
    targetTopicId?: number;
    expiredDemo?: boolean;
  } = {},
): ReportService {
  const reports =
    input.reports ??
    createReportRepository({
      resolveTarget: vi
        .fn()
        .mockResolvedValue(createTarget("post", input.targetUserId)),
      isChatRoomMember: vi.fn().mockResolvedValue(input.roomMember ?? true),
    });
  return new ReportService(
    reports,
    createBlockRepository(input),
    createParticipationRepository(input),
    createAppReviewConfigRepository(),
    createChatRepository(input),
    () => NOW,
  );
}

describe("ReportService", () => {
  it.each(["post", "post_comment", "message", "user"] as const)(
    "creates a %s report with the authenticated reporter",
    async (targetType) => {
      const reports = createReportRepository({
        resolveTarget: vi.fn().mockResolvedValue(createTarget(targetType)),
      });
      const service = createReportService({ reports });

      await service.create(1, { ...validInput, targetType });

      expect(reports.create).toHaveBeenCalledWith(
        expect.objectContaining({ reporterUserId: 1, targetUserId: 2 }),
      );
    },
  );

  it("returns an existing report before resolving target availability", async () => {
    const existing = createReport({ status: "action_taken" });
    const reports = createReportRepository({
      findExisting: vi.fn().mockResolvedValue(existing),
      resolveTarget: vi.fn().mockResolvedValue(undefined),
    });

    await expect(
      createReportService({ reports }).create(1, validInput),
    ).resolves.toEqual({
      id: 30,
      targetType: "post",
      targetId: 10,
      status: "action_taken",
      createdAt: "2026-08-29T00:10:00.000Z",
    });
    expect(reports.resolveTarget).not.toHaveBeenCalled();
    expect(reports.create).not.toHaveBeenCalled();
  });

  it("rejects a target that cannot be resolved", async () => {
    const reports = createReportRepository({
      resolveTarget: vi.fn().mockResolvedValue(undefined),
    });

    await expect(
      createReportService({ reports }).create(1, validInput),
    ).rejects.toEqual(new ReportServiceError("REPORT_TARGET_NOT_FOUND"));
  });

  it("rejects self content and blocked targets", async () => {
    await expect(
      createReportService({ targetUserId: 1 }).create(1, validInput),
    ).rejects.toEqual(new ReportServiceError("CANNOT_REPORT_SELF"));
    await expect(
      createReportService({ blocked: true }).create(1, validInput),
    ).rejects.toEqual(new ReportServiceError("REPORT_TARGET_NOT_ACCESSIBLE"));
  });

  it("rejects post content from a different effective Topic", async () => {
    await expect(
      createReportService({ reporterTopicId: 21 }).create(1, validInput),
    ).rejects.toEqual(new ReportServiceError("REPORT_TARGET_NOT_ACCESSIBLE"));
  });

  it("rejects post content after the demo participation expires", async () => {
    await expect(
      createReportService({ expiredDemo: true }).create(1, validInput),
    ).rejects.toEqual(new ReportServiceError("REPORT_TARGET_NOT_ACCESSIBLE"));
  });

  it("requires the reporter to be a member of a message room", async () => {
    const reports = createReportRepository({
      resolveTarget: vi.fn().mockResolvedValue(createTarget("message")),
      isChatRoomMember: vi.fn().mockResolvedValue(false),
    });

    await expect(
      createReportService({ reports }).create(1, {
        ...validInput,
        targetType: "message",
      }),
    ).rejects.toEqual(new ReportServiceError("REPORT_TARGET_NOT_ACCESSIBLE"));
  });

  it("requires the current mutual chat policy for message targets", async () => {
    const reports = createReportRepository({
      resolveTarget: vi.fn().mockResolvedValue(createTarget("message")),
    });

    await expect(
      createReportService({ reports, mutual: false }).create(1, {
        ...validInput,
        targetType: "message",
      }),
    ).rejects.toEqual(new ReportServiceError("REPORT_TARGET_NOT_ACCESSIBLE"));
  });

  it("requires effective active participation in the same Topic for messages", async () => {
    const reports = createReportRepository({
      resolveTarget: vi.fn().mockResolvedValue(createTarget("message")),
    });

    await expect(
      createReportService({ reports, targetTopicId: 21 }).create(1, {
        ...validInput,
        targetType: "message",
      }),
    ).rejects.toEqual(new ReportServiceError("REPORT_TARGET_NOT_ACCESSIBLE"));
  });

  it("allows a user target from a shared room without a current shared Topic", async () => {
    const reports = createReportRepository({
      resolveTarget: vi.fn().mockResolvedValue(createTarget("user")),
    });

    await expect(
      createReportService({
        reports,
        targetTopicId: 21,
        sharedRoom: true,
      }).create(1, { ...validInput, targetType: "user" }),
    ).resolves.toMatchObject({ targetType: "user", targetId: 10 });
  });

  it("rejects an inaccessible user target", async () => {
    const reports = createReportRepository({
      resolveTarget: vi.fn().mockResolvedValue(createTarget("user")),
    });

    await expect(
      createReportService({ reports, targetTopicId: 21 }).create(1, {
        ...validInput,
        targetType: "user",
      }),
    ).rejects.toEqual(new ReportServiceError("REPORT_TARGET_NOT_ACCESSIBLE"));
  });

  it("normalizes whitespace-only details to null and preserves other input", async () => {
    const whitespaceReports = createReportRepository();
    await createReportService({ reports: whitespaceReports }).create(1, {
      ...validInput,
      details: " \n\t ",
    });
    expect(whitespaceReports.create).toHaveBeenCalledWith(
      expect.objectContaining({ details: null }),
    );

    const exactReports = createReportRepository();
    await createReportService({ reports: exactReports }).create(1, {
      ...validInput,
      details: "  preserve this exactly  ",
    });
    expect(exactReports.create).toHaveBeenCalledWith(
      expect.objectContaining({ details: "  preserve this exactly  " }),
    );
  });

  it("accepts 500 details characters and rejects 501", async () => {
    await expect(
      createReportService().create(1, {
        ...validInput,
        details: "a".repeat(500),
      }),
    ).resolves.toBeDefined();
    await expect(
      createReportService().create(1, {
        ...validInput,
        details: "a".repeat(501),
      }),
    ).rejects.toEqual(new ReportServiceError("REPORT_DETAILS_TOO_LONG"));
  });
});
