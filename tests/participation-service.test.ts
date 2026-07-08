import { describe, expect, it, vi } from "vitest";
import type { Topic, Post, Participation } from "../drizzle/schema";
import type {
  ActiveParticipationRecord,
  ParticipationRepository,
} from "../server/repositories/participation-repository";
import { ParticipationService } from "../server/services/participation-service";

const now = new Date("2026-07-08T12:00:00.000Z");

function createRepository(): ParticipationRepository {
  return {
    findActiveByUserId: vi.fn(),
    markExpired: vi.fn(),
  };
}

function createRecord(overrides: Partial<ActiveParticipationRecord> = {}): ActiveParticipationRecord {
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
});
