import type {
  ActiveParticipationRecord,
  ParticipationRepository,
} from "../repositories/participation-repository";
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
  location: CurrentLocation;
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
  ) {}

  async getCurrent(userId: number): Promise<CurrentParticipationResponse> {
    const now = this.clock();
    const record = await this.repository.findActiveByUserId(userId);

    if (!record) {
      return this.emptyResponse(now);
    }

    if (record.topic.endAt <= now) {
      await this.repository.markExpired(record.participation.id);
      return this.emptyResponse(now);
    }

    return this.toCurrentResponse(record, now);
  }

  async checkOut(userId: number): Promise<CurrentParticipationResponse> {
    const now = this.clock();
    const record = await this.repository.findActiveByUserId(userId);

    if (!record) {
      return this.emptyResponse(now);
    }

    if (record.topic.endAt <= now) {
      await this.repository.markExpired(record.participation.id);
      return this.emptyResponse(now);
    }

    await this.repository.markCheckedOut(record.participation.id, now);
    return this.emptyResponse(now);
  }

  async checkIn(userId: number, input: CheckInInput): Promise<CurrentParticipationResponse> {
    const now = this.clock();
    const activeRecord = await this.repository.findActiveByUserId(userId);

    if (activeRecord) {
      if (activeRecord.topic.endAt <= now) {
        await this.repository.markExpired(activeRecord.participation.id);
      } else {
        throw new ParticipationServiceError("ACTIVE_PARTICIPATION_EXISTS");
      }
    }

    const topic = await this.repository.findTopicById(input.topicId);
    if (!topic) {
      throw new ParticipationServiceError("TOPIC_NOT_FOUND");
    }
    if (topic.startAt > now) {
      throw new ParticipationServiceError("TOPIC_NOT_STARTED");
    }
    if (topic.endAt <= now) {
      throw new ParticipationServiceError("TOPIC_CLOSED");
    }

    const locationResult = validateCheckInLocation(
      { latitude: topic.latitude, longitude: topic.longitude },
      input.location,
      DEFAULT_CHECK_IN_LOCATION_POLICY,
    );

    if (!locationResult.ok) {
      throw new ParticipationServiceError(locationResult.reason);
    }

    await this.validateImage(userId, input.imageStorageKey);

    const existingPost = await this.repository.findPostByImageStorageKey(input.imageStorageKey);
    if (existingPost) {
      throw new ParticipationServiceError("IMAGE_ALREADY_USED");
    }

    const existingParticipation = await this.repository.findByUserIdAndTopicId(userId, input.topicId);
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

      return this.toCurrentResponse(record, now);
    }

    const record = await this.repository.createActiveParticipation({
      userId,
      topicId: input.topicId,
      imageStorageKey: input.imageStorageKey,
      caption: input.caption,
    });

    return this.toCurrentResponse(record, now);
  }

  private async deleteOldImageBestEffort(imageStorageKey: string): Promise<void> {
    if (!this.storage) {
      return;
    }

    try {
      await this.storage.deleteObject(imageStorageKey);
    } catch (error) {
      console.warn("[participation] failed to delete replaced image", error);
    }
  }

  private async validateImage(userId: number, imageStorageKey: string): Promise<void> {
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
    if (!metadata.contentType || !this.isAllowedContentType(metadata.contentType)) {
      throw new ParticipationServiceError("INVALID_IMAGE_CONTENT_TYPE");
    }
    if (metadata.contentLength === null || metadata.contentLength > MAX_UPLOAD_IMAGE_BYTES) {
      throw new ParticipationServiceError("IMAGE_TOO_LARGE");
    }
  }

  private isAllowedContentType(contentType: string): boolean {
    return ALLOWED_IMAGE_CONTENT_TYPES.some((allowed) => allowed === contentType);
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
  ): CurrentParticipationResponse {
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
        startAt: record.topic.startAt.toISOString(),
        endAt: record.topic.endAt.toISOString(),
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
      expiresAt: record.topic.endAt.toISOString(),
      serverNow: now.toISOString(),
    };
  }
}
