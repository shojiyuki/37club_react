import type {
  ActiveParticipationRecord,
  ParticipationRepository,
} from "../repositories/participation-repository";
import {
  noAppReviewConfigRepository,
  type AppReviewConfigRepository,
} from "../repositories/app-review-config-repository";
import type { AppReviewConfig } from "../../drizzle/schema";
import { logServerEvent } from "../_core/server-logger";
import {
  canUseDemoTopic,
  getDemoParticipationEndAt,
  isConfiguredDemoTopic,
} from "../domain/app-review";
import { resolveParticipationExpiresAt } from "../domain/participation-access";
import {
  DEFAULT_CHECK_IN_LOCATION_POLICY,
  validateCheckInLocation,
  type CurrentLocation,
} from "../domain/location";
import type { Storage } from "../storage/storage";
import {
  ALLOWED_IMAGE_CONTENT_TYPES,
  MAX_UPLOAD_IMAGE_BYTES,
} from "./storage-service";

export type CurrentParticipationResponse = {
  participation: {
    id: number;
    userId: number;
    topicId: number;
    postId: number;
    status: "active" | "checked_out" | "expired";
    checkedInAt: string;
    checkedOutAt: string | null;
  } | null;
  topic: {
    id: number;
    startAt: string;
    endAt: string;
    locationName: string;
    latitude: number;
    longitude: number;
    prompt: string;
  } | null;
  post: {
    id: number;
    userId: number;
    topicId: number;
    imageStorageKey: string;
    caption: string;
    createdAt: string;
  } | null;
  expiresAt: string | null;
  serverNow: string;
};

type Clock = () => Date;

export type CheckInInput = {
  topicId: number;
  imageStorageKey: string;
  caption: string;
  location?: CurrentLocation;
};

export type ParticipationServiceErrorCode =
  | "ACTIVE_PARTICIPATION_EXISTS"
  | "IMAGE_ALREADY_USED"
  | "IMAGE_NOT_FOUND"
  | "INVALID_IMAGE_CONTENT_TYPE"
  | "IMAGE_TOO_LARGE"
  | "INVALID_IMAGE_KEY"
  | "INVALID_LOCATION"
  | "LOCATION_TOO_INACCURATE"
  | "OUTSIDE_TOPIC_AREA"
  | "TOPIC_CLOSED"
  | "TOPIC_NOT_FOUND"
  | "TOPIC_NOT_STARTED";

export class ParticipationServiceError extends Error {
  constructor(readonly code: ParticipationServiceErrorCode) {
    super(code);
  }
}

export class ParticipationService {
  constructor(
    private readonly repository: ParticipationRepository,
    private readonly clock: Clock = () => new Date(),
    private readonly storage: Storage | null = null,
    private readonly appReviewConfigRepository: AppReviewConfigRepository = noAppReviewConfigRepository,
  ) {}

  async getCurrent(userId: number): Promise<CurrentParticipationResponse> {
    const now = this.clock();
    const record = await this.repository.findActiveByUserId(userId);

    if (!record) {
      return this.emptyResponse(now);
    }

    const appReviewConfig = await this.appReviewConfigRepository.findByTopicId(
      record.topic.id,
    );
    const expiresAt = this.getExpiresAt(record, appReviewConfig, now);
    if (!expiresAt || expiresAt <= now) {
      await this.repository.markExpired(record.participation.id);
      return this.emptyResponse(now);
    }

    return this.toCurrentResponse(
      record,
      now,
      expiresAt,
      this.isDemoRecord(record, appReviewConfig, now),
    );
  }

  async checkOut(userId: number): Promise<CurrentParticipationResponse> {
    const now = this.clock();
    const record = await this.repository.findActiveByUserId(userId);

    if (!record) {
      return this.emptyResponse(now);
    }

    const appReviewConfig = await this.appReviewConfigRepository.findByTopicId(
      record.topic.id,
    );
    const expiresAt = this.getExpiresAt(record, appReviewConfig, now);
    if (!expiresAt || expiresAt <= now) {
      await this.repository.markExpired(record.participation.id);
      return this.emptyResponse(now);
    }

    await this.repository.markCheckedOut(record.participation.id, now);
    return this.emptyResponse(now);
  }

  async checkIn(
    userId: number,
    input: CheckInInput,
  ): Promise<CurrentParticipationResponse> {
    const now = this.clock();
    const activeRecord = await this.repository.findActiveByUserId(userId);

    if (activeRecord) {
      const activeAppReviewConfig =
        await this.appReviewConfigRepository.findByTopicId(
          activeRecord.topic.id,
        );
      const activeExpiresAt = this.getExpiresAt(
        activeRecord,
        activeAppReviewConfig,
        now,
      );
      if (!activeExpiresAt || activeExpiresAt <= now) {
        await this.repository.markExpired(activeRecord.participation.id);
      } else {
        throw new ParticipationServiceError("ACTIVE_PARTICIPATION_EXISTS");
      }
    }

    const topic = await this.repository.findTopicById(input.topicId);
    if (!topic) {
      throw new ParticipationServiceError("TOPIC_NOT_FOUND");
    }
    const appReviewConfig = await this.appReviewConfigRepository.findByTopicId(
      topic.id,
    );
    const isConfiguredDemo = isConfiguredDemoTopic(appReviewConfig, topic.id);
    const isDemo = canUseDemoTopic(appReviewConfig, topic.id, now);
    if (isConfiguredDemo && !isDemo) {
      throw new ParticipationServiceError("TOPIC_CLOSED");
    }
    if (!isDemo) {
      if (topic.startAt > now) {
        throw new ParticipationServiceError("TOPIC_NOT_STARTED");
      }
      if (topic.endAt <= now) {
        throw new ParticipationServiceError("TOPIC_CLOSED");
      }
      if (!input.location) {
        throw new ParticipationServiceError("INVALID_LOCATION");
      }

      const locationResult = validateCheckInLocation(
        { latitude: topic.latitude, longitude: topic.longitude },
        input.location,
        DEFAULT_CHECK_IN_LOCATION_POLICY,
      );

      if (!locationResult.ok) {
        throw new ParticipationServiceError(locationResult.reason);
      }
    }

    await this.validateImage(userId, input.imageStorageKey);

    const existingPost = await this.repository.findPostByImageStorageKey(
      input.imageStorageKey,
    );
    if (existingPost) {
      throw new ParticipationServiceError("IMAGE_ALREADY_USED");
    }

    const existingParticipation = await this.repository.findByUserIdAndTopicId(
      userId,
      input.topicId,
    );
    if (existingParticipation) {
      const oldImageStorageKey = existingParticipation.post.imageStorageKey;
      const record = await this.repository.reactivateParticipation({
        participationId: existingParticipation.participation.id,
        postId: existingParticipation.post.id,
        imageStorageKey: input.imageStorageKey,
        caption: input.caption,
        checkedInAt: now,
      });

      if (oldImageStorageKey !== input.imageStorageKey) {
        await this.deleteOldImageBestEffort(oldImageStorageKey);
      }

      return this.toCurrentResponse(
        record,
        now,
        isDemo
          ? getDemoParticipationEndAt(record.participation.checkedInAt)
          : record.topic.endAt,
        isDemo,
      );
    }

    const record = await this.repository.createActiveParticipation({
      userId,
      topicId: input.topicId,
      imageStorageKey: input.imageStorageKey,
      caption: input.caption,
      checkedInAt: now,
    });

    return this.toCurrentResponse(
      record,
      now,
      isDemo
        ? getDemoParticipationEndAt(record.participation.checkedInAt)
        : record.topic.endAt,
      isDemo,
    );
  }

  private isDemoRecord(
    record: ActiveParticipationRecord,
    appReviewConfig: AppReviewConfig | undefined,
    now: Date,
  ): boolean {
    return canUseDemoTopic(appReviewConfig, record.topic.id, now);
  }

  private getExpiresAt(
    record: ActiveParticipationRecord,
    appReviewConfig: AppReviewConfig | undefined,
    now: Date,
  ): Date | null {
    return resolveParticipationExpiresAt({
      topicId: record.topic.id,
      topicEndAt: record.topic.endAt,
      checkedInAt: record.participation.checkedInAt,
      appReviewConfig,
      now,
    });
  }

  private async deleteOldImageBestEffort(
    imageStorageKey: string,
  ): Promise<void> {
    if (!this.storage) {
      return;
    }

    try {
      await this.storage.deleteObject(imageStorageKey);
    } catch (error) {
      logServerEvent("warn", "storage_delete_failed", {
        operation: "delete_replaced_participation_image",
        error_name: error instanceof Error ? error.name : "UnknownError",
      });
    }
  }

  private async validateImage(
    userId: number,
    imageStorageKey: string,
  ): Promise<void> {
    if (!imageStorageKey.startsWith(`users/${userId}/posts/`)) {
      throw new ParticipationServiceError("INVALID_IMAGE_KEY");
    }
    if (!this.storage) {
      return;
    }

    const metadata = await this.storage.getObjectMetadata(imageStorageKey);
    if (!metadata) {
      throw new ParticipationServiceError("IMAGE_NOT_FOUND");
    }
    if (
      !metadata.contentType ||
      !this.isAllowedContentType(metadata.contentType)
    ) {
      throw new ParticipationServiceError("INVALID_IMAGE_CONTENT_TYPE");
    }
    if (
      metadata.contentLength === null ||
      metadata.contentLength > MAX_UPLOAD_IMAGE_BYTES
    ) {
      throw new ParticipationServiceError("IMAGE_TOO_LARGE");
    }
  }

  private isAllowedContentType(contentType: string): boolean {
    return ALLOWED_IMAGE_CONTENT_TYPES.some(
      (allowed) => allowed === contentType,
    );
  }

  private emptyResponse(now: Date): CurrentParticipationResponse {
    return {
      participation: null,
      topic: null,
      post: null,
      expiresAt: null,
      serverNow: now.toISOString(),
    };
  }

  private toCurrentResponse(
    record: ActiveParticipationRecord,
    now: Date,
    expiresAt: Date,
    isDemo: boolean,
  ): CurrentParticipationResponse {
    const effectiveStartAt = isDemo
      ? record.participation.checkedInAt
      : record.topic.startAt;
    return {
      participation: {
        id: record.participation.id,
        userId: record.participation.userId,
        topicId: record.participation.topicId,
        postId: record.participation.postId,
        status: record.participation.status,
        checkedInAt: record.participation.checkedInAt.toISOString(),
        checkedOutAt: record.participation.checkedOutAt?.toISOString() ?? null,
      },
      topic: {
        id: record.topic.id,
        startAt: effectiveStartAt.toISOString(),
        endAt: expiresAt.toISOString(),
        locationName: record.topic.locationName,
        latitude: record.topic.latitude,
        longitude: record.topic.longitude,
        prompt: record.topic.prompt,
      },
      post: {
        id: record.post.id,
        userId: record.post.userId,
        topicId: record.post.topicId,
        imageStorageKey: record.post.imageStorageKey,
        caption: record.post.caption,
        createdAt: record.post.createdAt.toISOString(),
      },
      expiresAt: expiresAt.toISOString(),
      serverNow: now.toISOString(),
    };
  }
}
