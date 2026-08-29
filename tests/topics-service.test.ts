import { describe, expect, it, vi } from "vitest";

import type { AppReviewConfig } from "../drizzle/schema";
import type { AppReviewConfigRepository } from "../server/repositories/app-review-config-repository";
import type {
  TopicRecord,
  TopicsRepository,
} from "../server/repositories/topics-repository";
import { TopicsService } from "../server/services/topics-service";

const NOW = new Date("2026-07-09T15:00:00.000Z");

function createTopic(overrides: Partial<TopicRecord> = {}): TopicRecord {
  return {
    id: 1,
    startAt: new Date("2026-07-09T15:39:01.000Z"),
    endAt: new Date("2026-07-09T16:16:01.000Z"),
    locationName: "杉並区阿佐谷南3丁目付近",
    latitude: 35.7030952,
    longitude: 139.6301901,
    prompt: "赤いもの",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function createRepository(records: TopicRecord[] = []): TopicsRepository {
  return {
    findAll: vi.fn().mockResolvedValue(records),
    findCurrentAndUpcoming: vi.fn().mockResolvedValue(records),
    findById: vi
      .fn()
      .mockImplementation(async (topicId: number) =>
        records.find((record) => record.id === topicId),
      ),
    create: vi.fn(),
    update: vi.fn(),
  };
}

function createAppReviewConfig(
  overrides: Partial<AppReviewConfig> = {},
): AppReviewConfig {
  return {
    enabled: true,
    topicId: 99,
    expiresAt: new Date("2026-07-10T15:00:00.000Z"),
    createdAt: NOW,
    updatedAt: NOW,
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

describe("TopicsService", () => {
  it("returns current and upcoming topics in app topic shape", async () => {
    const repository = createRepository([createTopic()]);
    const service = new TopicsService(repository, () => NOW);

    const result = await service.list();

    expect(result).toEqual([
      {
        id: "1",
        startAt: "2026-07-09T15:39:01.000Z",
        dateLabel: "2026/07/10（金）00:39",
        location: "杉並区阿佐谷南3丁目付近",
        lat: 35.7030952,
        lng: 139.6301901,
        items: "赤いもの",
        locationRequired: true,
      },
    ]);
    expect(repository.findCurrentAndUpcoming).toHaveBeenCalledWith(NOW);
  });

  it("returns an empty list when there are no visible topics", async () => {
    const service = new TopicsService(createRepository(), () => NOW);

    await expect(service.list()).resolves.toEqual([]);
  });

  it("adds the active demo topic with a fresh 37-minute start and no location requirement", async () => {
    const regularTopic = createTopic();
    const demoTopic = createTopic({
      id: 99,
      startAt: new Date("2026-07-01T00:00:00.000Z"),
      endAt: new Date("2026-07-01T00:37:00.000Z"),
      locationName: "Demo Location",
      prompt: "Demo Item",
    });
    const repository = createRepository([regularTopic, demoTopic]);
    const service = new TopicsService(
      repository,
      () => NOW,
      createAppReviewConfigRepository(createAppReviewConfig()),
    );

    await expect(service.list()).resolves.toEqual([
      expect.objectContaining({
        id: "1",
        locationRequired: true,
      }),
      {
        id: "99",
        startAt: NOW.toISOString(),
        dateLabel: "2026/07/10（金）00:00",
        location: "Demo Location",
        lat: demoTopic.latitude,
        lng: demoTopic.longitude,
        items: "Demo Item",
        locationRequired: false,
      },
    ]);
    expect(repository.findById).toHaveBeenCalledWith(99);
  });

  it("supports multiple active demo topics without a fixed config id", async () => {
    const firstDemoTopic = createTopic({ id: 98, prompt: "First Demo" });
    const secondDemoTopic = createTopic({ id: 99, prompt: "Second Demo" });
    const repository = createRepository([firstDemoTopic, secondDemoTopic]);
    const service = new TopicsService(
      repository,
      () => NOW,
      createAppReviewConfigRepository([
        createAppReviewConfig({ topicId: 98 }),
        createAppReviewConfig({ topicId: 99 }),
      ]),
    );

    await expect(service.list()).resolves.toEqual([
      expect.objectContaining({
        id: "98",
        items: "First Demo",
        locationRequired: false,
      }),
      expect.objectContaining({
        id: "99",
        items: "Second Demo",
        locationRequired: false,
      }),
    ]);
    expect(repository.findById).toHaveBeenCalledWith(98);
    expect(repository.findById).toHaveBeenCalledWith(99);
  });

  it("hides the configured demo topic when the config is disabled", async () => {
    const demoTopic = createTopic({ id: 99 });
    const repository = createRepository([demoTopic]);
    const service = new TopicsService(
      repository,
      () => NOW,
      createAppReviewConfigRepository(
        createAppReviewConfig({ enabled: false }),
      ),
    );

    await expect(service.list()).resolves.toEqual([]);
    expect(repository.findById).not.toHaveBeenCalled();
  });

  it("hides the configured demo topic when the config has expired", async () => {
    const demoTopic = createTopic({ id: 99 });
    const repository = createRepository([demoTopic]);
    const service = new TopicsService(
      repository,
      () => NOW,
      createAppReviewConfigRepository(
        createAppReviewConfig({ expiresAt: NOW }),
      ),
    );

    await expect(service.list()).resolves.toEqual([]);
    expect(repository.findById).not.toHaveBeenCalled();
  });
});
