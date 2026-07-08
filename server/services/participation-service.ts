import type {
  ActiveParticipationRecord,
  ParticipationRepository,
} from "../repositories/participation-repository";

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

export class ParticipationService {
  constructor(
    private readonly repository: ParticipationRepository,
    private readonly clock: Clock = () => new Date(),
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
