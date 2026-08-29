import { describe, expect, it } from "vitest";

import type { AppReviewConfig } from "../drizzle/schema";
import { resolveParticipationExpiresAt } from "../server/domain/participation-access";

const NOW = new Date("2026-08-29T00:00:00.000Z");
const TOPIC_END_AT = new Date("2026-08-29T00:20:00.000Z");
const CHECKED_IN_AT = new Date("2026-08-29T00:00:00.000Z");

function demoConfig(overrides: Partial<AppReviewConfig> = {}): AppReviewConfig {
  return {
    topicId: 4,
    enabled: true,
    expiresAt: new Date("2026-08-30T00:00:00.000Z"),
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

describe("resolveParticipationExpiresAt", () => {
  it("uses topics.endAt for a normal Topic", () => {
    expect(
      resolveParticipationExpiresAt({
        topicId: 1,
        topicEndAt: TOPIC_END_AT,
        checkedInAt: CHECKED_IN_AT,
        appReviewConfig: undefined,
        now: NOW,
      }),
    ).toEqual(TOPIC_END_AT);
  });

  it("uses checkedInAt plus 37 minutes for an enabled demo Topic", () => {
    expect(
      resolveParticipationExpiresAt({
        topicId: 4,
        topicEndAt: TOPIC_END_AT,
        checkedInAt: CHECKED_IN_AT,
        appReviewConfig: demoConfig(),
        now: NOW,
      }),
    ).toEqual(new Date("2026-08-29T00:37:00.000Z"));
  });

  it.each([demoConfig({ enabled: false }), demoConfig({ expiresAt: NOW })])(
    "returns null for an unavailable configured demo Topic",
    (config) => {
      expect(
        resolveParticipationExpiresAt({
          topicId: 4,
          topicEndAt: TOPIC_END_AT,
          checkedInAt: CHECKED_IN_AT,
          appReviewConfig: config,
          now: NOW,
        }),
      ).toBeNull();
    },
  );
});
