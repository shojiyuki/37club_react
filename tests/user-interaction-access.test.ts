import { describe, expect, it } from "vitest";

import type {
  AppReviewConfig,
  Participation,
  Post,
  Topic,
} from "../drizzle/schema";
import { areUsersEffectiveActiveInSameTopic } from "../server/domain/user-interaction-access";
import type { ActiveParticipationRecord } from "../server/repositories/participation-repository";

const NOW = new Date("2026-08-29T00:10:00.000Z");
const THIRTY_SEVEN_MINUTES_AGO = new Date("2026-08-28T23:33:00.000Z");

function createActiveRecord(input: {
  userId: number;
  topicId: number;
  checkedInAt?: Date;
}): ActiveParticipationRecord {
  const checkedInAt = input.checkedInAt ?? NOW;
  const participation: Participation = {
    id: input.userId,
    userId: input.userId,
    topicId: input.topicId,
    postId: input.userId,
    status: "active",
    checkedInAt,
    checkedOutAt: null,
    createdAt: checkedInAt,
    updatedAt: checkedInAt,
  };
  const topic: Topic = {
    id: input.topicId,
    startAt: new Date("2026-08-28T00:00:00.000Z"),
    endAt: new Date("2026-08-30T00:00:00.000Z"),
    locationName: "test",
    latitude: 35,
    longitude: 139,
    prompt: "test prompt",
    createdAt: NOW,
    updatedAt: NOW,
  };
  const post: Post = {
    id: input.userId,
    userId: input.userId,
    topicId: input.topicId,
    imageStorageKey: `users/${input.userId}/posts/test.jpg`,
    caption: "test",
    hiddenAt: null,
    createdAt: NOW,
    updatedAt: NOW,
  };

  return { participation, topic, post };
}

function createDemoConfig(input: { topicId: number }): AppReviewConfig {
  return {
    enabled: true,
    topicId: input.topicId,
    expiresAt: new Date("2026-08-30T00:00:00.000Z"),
    createdAt: NOW,
    updatedAt: NOW,
  };
}

describe("areUsersEffectiveActiveInSameTopic", () => {
  it("accepts two live participations in the same Topic", () => {
    expect(
      areUsersEffectiveActiveInSameTopic({
        first: createActiveRecord({ userId: 1, topicId: 4 }),
        second: createActiveRecord({ userId: 2, topicId: 4 }),
        appReviewConfig: createDemoConfig({ topicId: 4 }),
        now: NOW,
      }),
    ).toBe(true);
  });

  it("rejects an expired demo participation", () => {
    expect(
      areUsersEffectiveActiveInSameTopic({
        first: createActiveRecord({
          userId: 1,
          topicId: 4,
          checkedInAt: THIRTY_SEVEN_MINUTES_AGO,
        }),
        second: createActiveRecord({ userId: 2, topicId: 4 }),
        appReviewConfig: createDemoConfig({ topicId: 4 }),
        now: NOW,
      }),
    ).toBe(false);
  });

  it("rejects live participations in different Topics", () => {
    expect(
      areUsersEffectiveActiveInSameTopic({
        first: createActiveRecord({ userId: 1, topicId: 4 }),
        second: createActiveRecord({ userId: 2, topicId: 5 }),
        appReviewConfig: createDemoConfig({ topicId: 4 }),
        now: NOW,
      }),
    ).toBe(false);
  });
});
