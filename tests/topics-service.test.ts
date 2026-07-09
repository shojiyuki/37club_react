import { describe, expect, it, vi } from "vitest";

import type { TopicRecord, TopicsRepository } from "../server/repositories/topics-repository";
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
    findCurrentAndUpcoming: vi.fn().mockResolvedValue(records),
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
      },
    ]);
    expect(repository.findCurrentAndUpcoming).toHaveBeenCalledWith(NOW);
  });

  it("returns an empty list when there are no visible topics", async () => {
    const service = new TopicsService(createRepository(), () => NOW);

    await expect(service.list()).resolves.toEqual([]);
  });
});
