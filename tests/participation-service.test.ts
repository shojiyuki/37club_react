import { describe, expect, it, vi } from "vitest";
import type {
  AppReviewConfig,
  Topic,
  Post,
  Participation,
} from "../drizzle/schema";
import type { AppReviewConfigRepository } from "../server/repositories/app-review-config-repository";
import type {
  ActiveParticipationRecord,
  ParticipationRepository,
} from "../server/repositories/participation-repository";
import {
  ParticipationService,
  ParticipationServiceError,
} from "../server/services/participation-service";
import type { Storage } from "../server/storage/storage";

const now = new Date("2026-07-08T12:00:00.000Z");

function createRepository(): ParticipationRepository {
  return {
    findActiveByUserId: vi.fn(),
    findByUserIdAndTopicId: vi.fn(),
    findTopicById: vi.fn(),
    findPostByImageStorageKey: vi.fn(),
    createActiveParticipation: vi.fn(),
    reactivateParticipation: vi.fn(),
    markExpired: vi.fn(),
    markCheckedOut: vi.fn(),
  };
}

function createStorage(): Storage {
  return {
    createUploadUrl: vi.fn(),
    createReadUrl: vi.fn(),
    getObjectMetadata: vi.fn(),
    deleteObject: vi.fn(),
  };
}

function createAppReviewConfig(
  overrides: Partial<AppReviewConfig> = {},
): AppReviewConfig {
  return {
    enabled: true,
    topicId: 20,
    expiresAt: new Date("2026-07-09T12:00:00.000Z"),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createAppReviewConfigRepository(
  value?: AppReviewConfig | AppReviewConfig[],
): AppReviewConfigRepository {
  const configs = value ? (Array.isArray(value) ? value : [value]) : [];

  return {
    findAll: vi.fn().mockResolvedValue(configs),
    findByTopicId: vi
      .fn()
      .mockImplementation(async (topicId: number) =>
        configs.find((config) => config.topicId === topicId),
      ),
  };
}

function createRecord(
  overrides: Partial<ActiveParticipationRecord> = {},
): ActiveParticipationRecord {
  const participation: Participation = {
    id: 10,
    userId: 1,
    topicId: 20,
    postId: 30,
    status: "active",
    checkedInAt: new Date("2026-07-08T11:30:00.000Z"),
    checkedOutAt: null,
    createdAt: new Date("2026-07-08T11:30:00.000Z"),
    updatedAt: new Date("2026-07-08T11:30:00.000Z"),
  };
  const topic: Topic = {
    id: 20,
    startAt: new Date("2026-07-08T11:00:00.000Z"),
    endAt: new Date("2026-07-08T12:30:00.000Z"),
    locationName: "渋谷駅 ハチ公前",
    latitude: 35.6595,
    longitude: 139.7005,
    prompt: "赤いもの",
    createdAt: new Date("2026-07-08T10:00:00.000Z"),
    updatedAt: new Date("2026-07-08T10:00:00.000Z"),
  };
  const post: Post = {
    id: 30,
    userId: 1,
    topicId: 20,
    imageStorageKey: "posts/1/30.jpg",
    caption: "sample",
    hiddenAt: null,
    createdAt: new Date("2026-07-08T11:31:00.000Z"),
    updatedAt: new Date("2026-07-08T11:31:00.000Z"),
  };

  return {
    participation,
    topic,
    post,
    ...overrides,
  };
}

describe("ParticipationService", () => {
  it("returns an empty current participation when no active record exists", async () => {
    const repository = createRepository();
    vi.mocked(repository.findActiveByUserId).mockResolvedValue(undefined);
    const service = new ParticipationService(repository, () => now);

    await expect(service.getCurrent(1)).resolves.toEqual({
      participation: null,
      topic: null,
      post: null,
      expiresAt: null,
      serverNow: "2026-07-08T12:00:00.000Z",
    });
    expect(repository.markExpired).not.toHaveBeenCalled();
  });

  it("returns the active participation while the topic is still open", async () => {
    const repository = createRepository();
    vi.mocked(repository.findActiveByUserId).mockResolvedValue(createRecord());
    const service = new ParticipationService(repository, () => now);

    await expect(service.getCurrent(1)).resolves.toMatchObject({
      participation: {
        id: 10,
        userId: 1,
        topicId: 20,
        postId: 30,
        status: "active",
        checkedInAt: "2026-07-08T11:30:00.000Z",
        checkedOutAt: null,
      },
      topic: {
        id: 20,
        endAt: "2026-07-08T12:30:00.000Z",
        locationName: "渋谷駅 ハチ公前",
      },
      post: {
        id: 30,
        imageStorageKey: "posts/1/30.jpg",
        caption: "sample",
      },
      expiresAt: "2026-07-08T12:30:00.000Z",
      serverNow: "2026-07-08T12:00:00.000Z",
    });
    expect(repository.markExpired).not.toHaveBeenCalled();
  });

  it("expires the active participation when the topic has ended", async () => {
    const repository = createRepository();
    vi.mocked(repository.findActiveByUserId).mockResolvedValue(
      createRecord({
        topic: {
          ...createRecord().topic,
          endAt: new Date("2026-07-08T12:00:00.000Z"),
        },
      }),
    );
    const service = new ParticipationService(repository, () => now);

    await expect(service.getCurrent(1)).resolves.toEqual({
      participation: null,
      topic: null,
      post: null,
      expiresAt: null,
      serverNow: "2026-07-08T12:00:00.000Z",
    });
    expect(repository.markExpired).toHaveBeenCalledWith(10);
  });

  it("checks out the active participation using the server time", async () => {
    const repository = createRepository();
    vi.mocked(repository.findActiveByUserId).mockResolvedValue(createRecord());
    const service = new ParticipationService(repository, () => now);

    await expect(service.checkOut(1)).resolves.toEqual({
      participation: null,
      topic: null,
      post: null,
      expiresAt: null,
      serverNow: "2026-07-08T12:00:00.000Z",
    });
    expect(repository.markCheckedOut).toHaveBeenCalledWith(10, now);
    expect(repository.markExpired).not.toHaveBeenCalled();
  });

  it("treats checkout without an active participation as successful", async () => {
    const repository = createRepository();
    vi.mocked(repository.findActiveByUserId).mockResolvedValue(undefined);
    const service = new ParticipationService(repository, () => now);

    await expect(service.checkOut(1)).resolves.toEqual({
      participation: null,
      topic: null,
      post: null,
      expiresAt: null,
      serverNow: "2026-07-08T12:00:00.000Z",
    });
    expect(repository.markCheckedOut).not.toHaveBeenCalled();
    expect(repository.markExpired).not.toHaveBeenCalled();
  });

  it("expires an ended participation instead of checking it out", async () => {
    const repository = createRepository();
    vi.mocked(repository.findActiveByUserId).mockResolvedValue(
      createRecord({
        topic: {
          ...createRecord().topic,
          endAt: new Date("2026-07-08T12:00:00.000Z"),
        },
      }),
    );
    const service = new ParticipationService(repository, () => now);

    await service.checkOut(1);

    expect(repository.markExpired).toHaveBeenCalledWith(10);
    expect(repository.markCheckedOut).not.toHaveBeenCalled();
  });

  it("creates a post and active participation after validating topic, location, and image", async () => {
    const repository = createRepository();
    const storage = createStorage();
    const record = createRecord();
    vi.mocked(repository.findActiveByUserId).mockResolvedValue(undefined);
    vi.mocked(repository.findTopicById).mockResolvedValue(record.topic);
    vi.mocked(repository.findPostByImageStorageKey).mockResolvedValue(
      undefined,
    );
    vi.mocked(repository.createActiveParticipation).mockResolvedValue(record);
    vi.mocked(storage.getObjectMetadata).mockResolvedValue({
      key: "users/1/posts/photo.jpg",
      contentType: "image/jpeg",
      contentLength: 1024,
    });
    const service = new ParticipationService(repository, () => now, storage);

    await expect(
      service.checkIn(1, {
        topicId: 20,
        imageStorageKey: "users/1/posts/photo.jpg",
        caption: "sample",
        location: {
          latitude: record.topic.latitude,
          longitude: record.topic.longitude,
          accuracy: 20,
        },
      }),
    ).resolves.toMatchObject({
      participation: {
        id: 10,
        status: "active",
      },
      post: {
        imageStorageKey: "posts/1/30.jpg",
      },
    });
    expect(repository.createActiveParticipation).toHaveBeenCalledWith({
      userId: 1,
      topicId: 20,
      imageStorageKey: "users/1/posts/photo.jpg",
      caption: "sample",
      checkedInAt: now,
    });
  });

  it("reactivates an existing checked-out participation and replaces the image", async () => {
    const repository = createRepository();
    const storage = createStorage();
    const existingRecord = createRecord({
      participation: {
        ...createRecord().participation,
        status: "checked_out",
        checkedOutAt: new Date("2026-07-08T11:45:00.000Z"),
      },
      post: {
        ...createRecord().post,
        imageStorageKey: "users/1/posts/old-photo.jpg",
        caption: "old",
      },
    });
    const reactivatedRecord = createRecord({
      participation: {
        ...existingRecord.participation,
        status: "active",
        checkedInAt: now,
        checkedOutAt: null,
      },
      post: {
        ...existingRecord.post,
        imageStorageKey: "users/1/posts/new-photo.jpg",
        caption: "new",
      },
    });
    vi.mocked(repository.findActiveByUserId).mockResolvedValue(undefined);
    vi.mocked(repository.findTopicById).mockResolvedValue(existingRecord.topic);
    vi.mocked(repository.findPostByImageStorageKey).mockResolvedValue(
      undefined,
    );
    vi.mocked(repository.findByUserIdAndTopicId).mockResolvedValue(
      existingRecord,
    );
    vi.mocked(repository.reactivateParticipation).mockResolvedValue(
      reactivatedRecord,
    );
    vi.mocked(storage.getObjectMetadata).mockResolvedValue({
      key: "users/1/posts/new-photo.jpg",
      contentType: "image/jpeg",
      contentLength: 1024,
    });
    const service = new ParticipationService(repository, () => now, storage);

    await expect(
      service.checkIn(1, {
        topicId: 20,
        imageStorageKey: "users/1/posts/new-photo.jpg",
        caption: "new",
        location: {
          latitude: existingRecord.topic.latitude,
          longitude: existingRecord.topic.longitude,
          accuracy: 20,
        },
      }),
    ).resolves.toMatchObject({
      participation: {
        id: 10,
        status: "active",
        checkedInAt: "2026-07-08T12:00:00.000Z",
        checkedOutAt: null,
      },
      post: {
        imageStorageKey: "users/1/posts/new-photo.jpg",
        caption: "new",
      },
    });
    expect(repository.createActiveParticipation).not.toHaveBeenCalled();
    expect(repository.reactivateParticipation).toHaveBeenCalledWith({
      participationId: 10,
      postId: 30,
      imageStorageKey: "users/1/posts/new-photo.jpg",
      caption: "new",
      checkedInAt: now,
    });
    expect(storage.deleteObject).toHaveBeenCalledWith(
      "users/1/posts/old-photo.jpg",
    );
  });

  it("rejects check-in when the image key does not belong to the user prefix", async () => {
    const repository = createRepository();
    vi.mocked(repository.findActiveByUserId).mockResolvedValue(undefined);
    vi.mocked(repository.findTopicById).mockResolvedValue(createRecord().topic);
    const service = new ParticipationService(
      repository,
      () => now,
      createStorage(),
    );

    await expect(
      service.checkIn(1, {
        topicId: 20,
        imageStorageKey: "users/2/posts/photo.jpg",
        caption: "sample",
        location: {
          latitude: 35.6595,
          longitude: 139.7005,
          accuracy: 20,
        },
      }),
    ).rejects.toMatchObject(new ParticipationServiceError("INVALID_IMAGE_KEY"));
  });

  it("rejects check-in when the current location is outside the topic area", async () => {
    const repository = createRepository();
    vi.mocked(repository.findActiveByUserId).mockResolvedValue(undefined);
    vi.mocked(repository.findTopicById).mockResolvedValue(createRecord().topic);
    const service = new ParticipationService(
      repository,
      () => now,
      createStorage(),
    );

    await expect(
      service.checkIn(1, {
        topicId: 20,
        imageStorageKey: "users/1/posts/photo.jpg",
        caption: "sample",
        location: {
          latitude: 35.7,
          longitude: 139.7005,
          accuracy: 20,
        },
      }),
    ).rejects.toMatchObject(
      new ParticipationServiceError("OUTSIDE_TOPIC_AREA"),
    );
  });

  it("requires location for a normal topic", async () => {
    const repository = createRepository();
    vi.mocked(repository.findActiveByUserId).mockResolvedValue(undefined);
    vi.mocked(repository.findTopicById).mockResolvedValue(createRecord().topic);
    const service = new ParticipationService(
      repository,
      () => now,
      createStorage(),
    );

    await expect(
      service.checkIn(1, {
        topicId: 20,
        imageStorageKey: "users/1/posts/photo.jpg",
        caption: "sample",
      }),
    ).rejects.toMatchObject(new ParticipationServiceError("INVALID_LOCATION"));
  });

  it("allows demo topic check-in without location or an active base topic window", async () => {
    const repository = createRepository();
    const storage = createStorage();
    const demoRecord = createRecord({
      participation: {
        ...createRecord().participation,
        checkedInAt: now,
      },
      topic: {
        ...createRecord().topic,
        startAt: new Date("2026-07-01T00:00:00.000Z"),
        endAt: new Date("2026-07-01T00:37:00.000Z"),
      },
    });
    vi.mocked(repository.findActiveByUserId).mockResolvedValue(undefined);
    vi.mocked(repository.findTopicById).mockResolvedValue(demoRecord.topic);
    vi.mocked(repository.findPostByImageStorageKey).mockResolvedValue(
      undefined,
    );
    vi.mocked(repository.createActiveParticipation).mockResolvedValue(
      demoRecord,
    );
    vi.mocked(storage.getObjectMetadata).mockResolvedValue({
      key: "users/1/posts/photo.jpg",
      contentType: "image/jpeg",
      contentLength: 1024,
    });
    const service = new ParticipationService(
      repository,
      () => now,
      storage,
      createAppReviewConfigRepository(createAppReviewConfig()),
    );

    await expect(
      service.checkIn(1, {
        topicId: 20,
        imageStorageKey: "users/1/posts/photo.jpg",
        caption: "demo",
      }),
    ).resolves.toMatchObject({
      participation: {
        checkedInAt: "2026-07-08T12:00:00.000Z",
      },
      topic: {
        startAt: "2026-07-08T12:00:00.000Z",
        endAt: "2026-07-08T12:37:00.000Z",
      },
      expiresAt: "2026-07-08T12:37:00.000Z",
      serverNow: "2026-07-08T12:00:00.000Z",
    });
    expect(repository.createActiveParticipation).toHaveBeenCalledWith({
      userId: 1,
      topicId: 20,
      imageStorageKey: "users/1/posts/photo.jpg",
      caption: "demo",
      checkedInAt: now,
    });
  });

  it("uses checkedInAt plus 37 minutes for an active demo participation", async () => {
    const repository = createRepository();
    vi.mocked(repository.findActiveByUserId).mockResolvedValue(
      createRecord({
        topic: {
          ...createRecord().topic,
          endAt: new Date("2026-07-01T00:37:00.000Z"),
        },
      }),
    );
    const service = new ParticipationService(
      repository,
      () => now,
      null,
      createAppReviewConfigRepository(createAppReviewConfig()),
    );

    await expect(service.getCurrent(1)).resolves.toMatchObject({
      topic: {
        startAt: "2026-07-08T11:30:00.000Z",
        endAt: "2026-07-08T12:07:00.000Z",
      },
      expiresAt: "2026-07-08T12:07:00.000Z",
    });
    expect(repository.markExpired).not.toHaveBeenCalled();
  });

  it("expires a demo participation 37 minutes after check-in", async () => {
    const repository = createRepository();
    vi.mocked(repository.findActiveByUserId).mockResolvedValue(
      createRecord({
        participation: {
          ...createRecord().participation,
          checkedInAt: new Date("2026-07-08T11:23:00.000Z"),
        },
      }),
    );
    const service = new ParticipationService(
      repository,
      () => now,
      null,
      createAppReviewConfigRepository(createAppReviewConfig()),
    );

    await expect(service.getCurrent(1)).resolves.toMatchObject({
      participation: null,
      expiresAt: null,
    });
    expect(repository.markExpired).toHaveBeenCalledWith(10);
  });

  it("reactivates an expired demo participation with a new 37-minute window", async () => {
    const repository = createRepository();
    const storage = createStorage();
    const expiredActiveRecord = createRecord({
      participation: {
        ...createRecord().participation,
        checkedInAt: new Date("2026-07-08T11:23:00.000Z"),
      },
      topic: {
        ...createRecord().topic,
        startAt: new Date("2026-07-01T00:00:00.000Z"),
        endAt: new Date("2026-07-01T00:37:00.000Z"),
      },
      post: {
        ...createRecord().post,
        imageStorageKey: "users/1/posts/old-photo.jpg",
      },
    });
    const reactivatedRecord = createRecord({
      participation: {
        ...expiredActiveRecord.participation,
        status: "active",
        checkedInAt: now,
      },
      topic: expiredActiveRecord.topic,
      post: {
        ...expiredActiveRecord.post,
        imageStorageKey: "users/1/posts/new-photo.jpg",
      },
    });
    vi.mocked(repository.findActiveByUserId).mockResolvedValue(
      expiredActiveRecord,
    );
    vi.mocked(repository.findTopicById).mockResolvedValue(
      expiredActiveRecord.topic,
    );
    vi.mocked(repository.findPostByImageStorageKey).mockResolvedValue(
      undefined,
    );
    vi.mocked(repository.findByUserIdAndTopicId).mockResolvedValue(
      expiredActiveRecord,
    );
    vi.mocked(repository.reactivateParticipation).mockResolvedValue(
      reactivatedRecord,
    );
    vi.mocked(storage.getObjectMetadata).mockResolvedValue({
      key: "users/1/posts/new-photo.jpg",
      contentType: "image/jpeg",
      contentLength: 1024,
    });
    const service = new ParticipationService(
      repository,
      () => now,
      storage,
      createAppReviewConfigRepository(createAppReviewConfig()),
    );

    await expect(
      service.checkIn(1, {
        topicId: 20,
        imageStorageKey: "users/1/posts/new-photo.jpg",
        caption: "again",
      }),
    ).resolves.toMatchObject({
      participation: {
        checkedInAt: "2026-07-08T12:00:00.000Z",
      },
      expiresAt: "2026-07-08T12:37:00.000Z",
    });
    expect(repository.markExpired).toHaveBeenCalledWith(10);
    expect(repository.reactivateParticipation).toHaveBeenCalledWith({
      participationId: 10,
      postId: 30,
      imageStorageKey: "users/1/posts/new-photo.jpg",
      caption: "again",
      checkedInAt: now,
    });
  });

  it("rejects the configured demo topic when the config is disabled", async () => {
    const repository = createRepository();
    vi.mocked(repository.findActiveByUserId).mockResolvedValue(undefined);
    vi.mocked(repository.findTopicById).mockResolvedValue(createRecord().topic);
    const service = new ParticipationService(
      repository,
      () => now,
      createStorage(),
      createAppReviewConfigRepository(
        createAppReviewConfig({ enabled: false }),
      ),
    );

    await expect(
      service.checkIn(1, {
        topicId: 20,
        imageStorageKey: "users/1/posts/photo.jpg",
        caption: "demo",
      }),
    ).rejects.toMatchObject(new ParticipationServiceError("TOPIC_CLOSED"));
  });

  it("expires an active demo participation when the config expires", async () => {
    const repository = createRepository();
    vi.mocked(repository.findActiveByUserId).mockResolvedValue(createRecord());
    const service = new ParticipationService(
      repository,
      () => now,
      null,
      createAppReviewConfigRepository(
        createAppReviewConfig({ expiresAt: now }),
      ),
    );

    await expect(service.getCurrent(1)).resolves.toMatchObject({
      participation: null,
      expiresAt: null,
    });
    expect(repository.markExpired).toHaveBeenCalledWith(10);
  });
});
