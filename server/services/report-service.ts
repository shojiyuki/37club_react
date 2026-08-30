import type { Report } from "../../drizzle/schema";
import type { ReportStatus } from "../../shared/const";
import {
  areUsersEffectiveActiveInSameTopic,
  isParticipationEffective,
} from "../domain/user-interaction-access";
import type { AppReviewConfigRepository } from "../repositories/app-review-config-repository";
import type { BlockRepository } from "../repositories/block-repository";
import type { ChatRepository } from "../repositories/chat-repository";
import type { ParticipationRepository } from "../repositories/participation-repository";
import type {
  ReportReason,
  ReportRepository,
  ReportTarget,
  ReportTargetType,
} from "../repositories/report-repository";
import { logReportCreated } from "../_core/server-logger";

export type CreateReportInput = {
  targetType: ReportTargetType;
  targetId: number;
  reason: ReportReason;
  details?: string;
};

export type ReportResponse = {
  id: number;
  targetType: ReportTargetType;
  targetId: number;
  status: ReportStatus;
  createdAt: string;
};

export type ReportServiceErrorCode =
  | "CANNOT_REPORT_SELF"
  | "REPORT_TARGET_NOT_FOUND"
  | "REPORT_TARGET_NOT_ACCESSIBLE"
  | "REPORT_DETAILS_TOO_LONG";

export class ReportServiceError extends Error {
  constructor(readonly code: ReportServiceErrorCode) {
    super(code);
  }
}

export class ReportService {
  constructor(
    private readonly reportRepository: ReportRepository,
    private readonly blockRepository: BlockRepository,
    private readonly participationRepository: ParticipationRepository,
    private readonly appReviewConfigRepository: AppReviewConfigRepository,
    private readonly chatRepository: ChatRepository,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async create(
    reporterUserId: number,
    input: CreateReportInput,
  ): Promise<ReportResponse> {
    const existing = await this.reportRepository.findExisting(
      reporterUserId,
      input.targetType,
      input.targetId,
    );
    if (existing) return toReportResponse(existing);

    const target = await this.reportRepository.resolveTarget(
      input.targetType,
      input.targetId,
    );
    if (!target) {
      throw new ReportServiceError("REPORT_TARGET_NOT_FOUND");
    }
    if (target.targetUserId === reporterUserId) {
      throw new ReportServiceError("CANNOT_REPORT_SELF");
    }
    if (
      await this.blockRepository.hasEitherDirection(
        reporterUserId,
        target.targetUserId,
      )
    ) {
      throw new ReportServiceError("REPORT_TARGET_NOT_ACCESSIBLE");
    }

    await this.authorizeTarget(reporterUserId, target);
    const details = normalizeDetails(input.details);
    const report = await this.reportRepository.create({
      reporterUserId,
      targetType: target.targetType,
      targetId: target.targetId,
      targetUserId: target.targetUserId,
      reason: input.reason,
      details,
    });

    logReportCreated({
      reportId: report.id,
      targetType: report.targetType,
      status: report.status,
    });
    return toReportResponse(report);
  }

  private async authorizeTarget(
    reporterUserId: number,
    target: ReportTarget,
  ): Promise<void> {
    if (target.targetType === "post") {
      const reporter =
        await this.participationRepository.findActiveByUserId(reporterUserId);
      const appReviewConfig = reporter
        ? await this.appReviewConfigRepository.findByTopicId(reporter.topic.id)
        : undefined;
      if (
        !target.topicId ||
        reporter?.topic.id !== target.topicId ||
        !isParticipationEffective({
          record: reporter,
          appReviewConfig,
          now: this.clock(),
        })
      ) {
        throw new ReportServiceError("REPORT_TARGET_NOT_ACCESSIBLE");
      }
      return;
    }

    if (target.targetType === "message") {
      const isRoomMember =
        target.chatRoomId !== null &&
        (await this.reportRepository.isChatRoomMember(
          target.chatRoomId,
          reporterUserId,
        ));
      const [isMutual, sameTopic] = isRoomMember
        ? await Promise.all([
            this.chatRepository.areMutual(reporterUserId, target.targetUserId),
            this.chatRepository.areActiveInSameTopic(
              reporterUserId,
              target.targetUserId,
            ),
          ])
        : [false, false];
      if (!isRoomMember || !isMutual || !sameTopic) {
        throw new ReportServiceError("REPORT_TARGET_NOT_ACCESSIBLE");
      }
      return;
    }

    const [reporter, targetUser] = await Promise.all([
      this.participationRepository.findActiveByUserId(reporterUserId),
      this.participationRepository.findActiveByUserId(target.targetUserId),
    ]);
    const appReviewConfig = reporter
      ? await this.appReviewConfigRepository.findByTopicId(reporter.topic.id)
      : undefined;
    const sameTopic = areUsersEffectiveActiveInSameTopic({
      first: reporter,
      second: targetUser,
      appReviewConfig,
      now: this.clock(),
    });

    const sharedRoom = sameTopic
      ? false
      : await this.blockRepository.haveSharedChatRoom(
          reporterUserId,
          target.targetUserId,
        );
    if (!sameTopic && !sharedRoom) {
      throw new ReportServiceError("REPORT_TARGET_NOT_ACCESSIBLE");
    }
  }
}

function normalizeDetails(details: string | undefined): string | null {
  if (details && details.length > 500) {
    throw new ReportServiceError("REPORT_DETAILS_TOO_LONG");
  }
  return details?.trim() ? details : null;
}

function toReportResponse(report: Report): ReportResponse {
  return {
    id: report.id,
    targetType: report.targetType,
    targetId: report.targetId,
    status: report.status,
    createdAt: report.createdAt.toISOString(),
  };
}
