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
    findAll: vi.fn().mockResolvedValue(records),
    findById: vi
      .fn()
      .mockImplementation(async (topicId: number) =>
        records.find((record) => record.id === topicId),
      ),
    findCurrentAndUpcoming: vi.fn().mockResolvedValue(records),
    create: vi.fn().mockImplementation(async (input) =>
      createTopic({
        id: 10,
        ...input,
      }),
    ),
    update: vi.fn().mockImplementation(async (topicId, changes) => {
      const before = records.find((record) => record.id === topicId);
      if (!before) {
        return undefined;
      }

      return {
        before,
        after: createTopic({ ...before, ...changes }),
      };
    }),
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

  it("returns all Topics in repository order up to the requested limit", async () => {
    const repository = {
      ...createRepository([createTopic({ id: 99 })]),
      findAll: vi.fn().mockResolvedValue([
        createTopic({ id: 5 }),
        createTopic({ id: 4 }),
        createTopic({ id: 3 }),
      ]),
    };
    const service = new TopicManagementService(repository, () => NOW);

    const result = await service.select({
      action: "select",
      scope: "all",
      limit: 2,
    });

    expect(result.count).toBe(2);
    expect(result.topics.map((topic) => topic.topicId)).toEqual([5, 4]);
  });

  it("reports an unknown Topic ID", async () => {
    const service = new TopicManagementService(createRepository([]), () => NOW);

    await expect(
      service.select({ action: "select", topicId: 999 }),
    ).rejects.toEqual(new TopicManagementTopicNotFoundError(999));
  });

  it("creates a Topic with an end time exactly 37 minutes after start", async () => {
    const repository = createRepository([]);
    const service = new TopicManagementService(repository, () => NOW);

    const result = await service.insert({
      action: "insert",
      topic: {
        startAt: "2026-08-10T19:00:00+09:00",
        locationName: "阿佐ヶ谷",
        latitude: 35.704053,
        longitude: 139.63553,
        prompt: "今日いちばん印象に残ったこと",
      },
    });

    expect(repository.create).toHaveBeenCalledWith({
      startAt: new Date("2026-08-10T10:00:00.000Z"),
      endAt: new Date("2026-08-10T10:37:00.000Z"),
      locationName: "阿佐ヶ谷",
      latitude: 35.704053,
      longitude: 139.63553,
      prompt: "今日いちばん印象に残ったこと",
    });
    expect(result.action).toBe("insert");
    expect(result.topic.topicId).toBe(10);
    expect(result.topic.startAtJst).toBe("2026-08-10T19:00:00+09:00");
    expect(result.topic.endAtJst).toBe("2026-08-10T19:37:00+09:00");
  });

  it("updates only requested fields and recalculates endAt when startAt changes", async () => {
    const repository = createRepository([createTopic()]);
    const service = new TopicManagementService(repository, () => NOW);

    const result = await service.update({
      action: "update",
      topicId: 3,
      changes: {
        startAt: "2000-01-01T00:00:00+09:00",
      },
    });

    expect(repository.update).toHaveBeenCalledWith(3, {
      startAt: new Date("1999-12-31T15:00:00.000Z"),
      endAt: new Date("1999-12-31T15:37:00.000Z"),
    });
    expect(result.action).toBe("update");
    expect(result.before.startAtJst).toBe("2026-08-10T19:00:00+09:00");
    expect(result.topic.startAtJst).toBe("2000-01-01T00:00:00+09:00");
    expect(result.topic.endAtJst).toBe("2000-01-01T00:37:00+09:00");
  });

  it("does not change startAt or endAt when another field is updated", async () => {
    const repository = createRepository([createTopic()]);
    const service = new TopicManagementService(repository, () => NOW);

    const result = await service.update({
      action: "update",
      topicId: 3,
      changes: { prompt: "新しいお題" },
    });

    expect(repository.update).toHaveBeenCalledWith(3, {
      prompt: "新しいお題",
    });
    expect(result.topic.prompt).toBe("新しいお題");
    expect(result.topic.startAt).toBe(result.before.startAt);
    expect(result.topic.endAt).toBe(result.before.endAt);
  });

  it("reports an unknown Topic ID during update", async () => {
    const service = new TopicManagementService(createRepository([]), () => NOW);

    await expect(
      service.update({
        action: "update",
        topicId: 999,
        changes: { prompt: "新しいお題" },
      }),
    ).rejects.toEqual(new TopicManagementTopicNotFoundError(999));
  });
});
