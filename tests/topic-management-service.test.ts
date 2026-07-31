import { describe, expect, it, vi } from "vitest";

import type {
  TopicRecord,
  TopicsRepository,
} from "../server/repositories/topics-repository";
import {
  TopicManagementService,
  TopicManagementTopicNotFoundError,
} from "../server/topic-management/topic-management-service";

const NOW = new Date("2026-08-01T03:00:00.000Z");

function createTopic(overrides: Partial<TopicRecord> = {}): TopicRecord {
  return {
    id: 3,
    startAt: new Date("2026-08-10T10:00:00.000Z"),
    endAt: new Date("2026-08-10T10:37:00.000Z"),
    locationName: "クリムゾンハウス",
    latitude: 35.610145,
    longitude: 139.6304698,
    prompt: "最近うれしかったこと",
    createdAt: new Date("2026-08-01T00:00:00.000Z"),
    updatedAt: new Date("2026-08-01T01:00:00.000Z"),
    ...overrides,
  };
}

function createRepository(records: TopicRecord[]): TopicsRepository {
  return {
    findById: vi
      .fn()
      .mockImplementation(async (topicId: number) =>
        records.find((record) => record.id === topicId),
      ),
    findCurrentAndUpcoming: vi.fn().mockResolvedValue(records),
  };
}

describe("TopicManagementService", () => {
  it("returns the complete Topic with UTC and Japan timestamps by ID", async () => {
    const repository = createRepository([createTopic()]);
    const service = new TopicManagementService(repository, () => NOW);

    await expect(
      service.select({ action: "select", topicId: 3 }),
    ).resolves.toEqual({
      action: "select",
      count: 1,
      topics: [
        {
          topicId: 3,
          startAt: "2026-08-10T10:00:00.000Z",
          startAtJst: "2026-08-10T19:00:00+09:00",
          endAt: "2026-08-10T10:37:00.000Z",
          endAtJst: "2026-08-10T19:37:00+09:00",
          locationName: "クリムゾンハウス",
          latitude: 35.610145,
          longitude: 139.6304698,
          prompt: "最近うれしかったこと",
          createdAt: "2026-08-01T00:00:00.000Z",
          updatedAt: "2026-08-01T01:00:00.000Z",
        },
      ],
    });
    expect(repository.findById).toHaveBeenCalledWith(3);
  });

  it("returns only the requested number of current and upcoming Topics", async () => {
    const repository = createRepository([
      createTopic({ id: 3 }),
      createTopic({ id: 4 }),
      createTopic({ id: 5 }),
    ]);
    const service = new TopicManagementService(repository, () => NOW);

    const result = await service.select({
      action: "select",
      scope: "upcoming",
      limit: 2,
    });

    expect(result.count).toBe(2);
    expect(result.topics.map((topic) => topic.topicId)).toEqual([3, 4]);
    expect(repository.findCurrentAndUpcoming).toHaveBeenCalledWith(NOW);
  });

  it("reports an unknown Topic ID", async () => {
    const service = new TopicManagementService(createRepository([]), () => NOW);

    await expect(
      service.select({ action: "select", topicId: 999 }),
    ).rejects.toEqual(new TopicManagementTopicNotFoundError(999));
  });
});
