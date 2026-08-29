import { describe, expect, it } from "vitest";

import {
  topicManagementInputSchema,
  topicManagementSelectInputSchema,
} from "../server/topic-management/topic-management-schema";

describe("topicManagementSelectInputSchema", () => {
  it("accepts selection by topic ID", () => {
    expect(
      topicManagementSelectInputSchema.parse({
        action: "select",
        topicId: 3,
      }),
    ).toEqual({ action: "select", topicId: 3 });
  });

  it("defaults the upcoming selection limit to 50", () => {
    expect(
      topicManagementSelectInputSchema.parse({
        action: "select",
        scope: "upcoming",
      }),
    ).toEqual({ action: "select", scope: "upcoming", limit: 50 });
  });

  it("accepts all Topics selection and defaults the limit to 50", () => {
    expect(
      topicManagementSelectInputSchema.parse({
        action: "select",
        scope: "all",
      }),
    ).toEqual({ action: "select", scope: "all", limit: 50 });
  });

  it("rejects unsupported actions and ambiguous selection fields", () => {
    expect(
      topicManagementSelectInputSchema.safeParse({ action: "insert" }).success,
    ).toBe(false);
    expect(
      topicManagementSelectInputSchema.safeParse({
        action: "select",
        topicId: 3,
        scope: "upcoming",
      }).success,
    ).toBe(false);
  });

  it("rejects invalid topic IDs and limits", () => {
    expect(
      topicManagementSelectInputSchema.safeParse({
        action: "select",
        topicId: 0,
      }).success,
    ).toBe(false);
    expect(
      topicManagementSelectInputSchema.safeParse({
        action: "select",
        scope: "upcoming",
        limit: 51,
      }).success,
    ).toBe(false);
  });
});

describe("topicManagementInputSchema insert", () => {
  const validInput = {
    action: "insert" as const,
    topic: {
      startAt: "2026-08-10T19:00:00+09:00",
      locationName: "阿佐ヶ谷",
      latitude: 35.704053,
      longitude: 139.63553,
      prompt: "今日いちばん印象に残ったこと",
    },
  };

  it("accepts a complete Topic using an explicit Japan time offset", () => {
    expect(topicManagementInputSchema.parse(validInput)).toEqual(validInput);
  });

  it("rejects UTC, invalid calendar dates, and caller-supplied endAt", () => {
    expect(
      topicManagementInputSchema.safeParse({
        ...validInput,
        topic: { ...validInput.topic, startAt: "2026-08-10T10:00:00Z" },
      }).success,
    ).toBe(false);
    expect(
      topicManagementInputSchema.safeParse({
        ...validInput,
        topic: {
          ...validInput.topic,
          startAt: "2026-02-30T19:00:00+09:00",
        },
      }).success,
    ).toBe(false);
    expect(
      topicManagementInputSchema.safeParse({
        ...validInput,
        topic: {
          ...validInput.topic,
          endAt: "2026-08-10T19:37:00+09:00",
        },
      }).success,
    ).toBe(false);
  });

  it("rejects invalid coordinates and multiline prompts", () => {
    expect(
      topicManagementInputSchema.safeParse({
        ...validInput,
        topic: { ...validInput.topic, latitude: 91 },
      }).success,
    ).toBe(false);
    expect(
      topicManagementInputSchema.safeParse({
        ...validInput,
        topic: { ...validInput.topic, prompt: "1行目\n2行目" },
      }).success,
    ).toBe(false);
  });
});

describe("topicManagementInputSchema update", () => {
  it("accepts a partial update with a positive Topic ID", () => {
    const input = {
      action: "update",
      topicId: 3,
      changes: { prompt: "新しいお題" },
    };

    expect(topicManagementInputSchema.parse(input)).toEqual(input);
  });

  it("accepts a startAt update using Japan time", () => {
    const input = {
      action: "update",
      topicId: 3,
      changes: { startAt: "2000-01-01T00:00:00+09:00" },
    };

    expect(topicManagementInputSchema.parse(input)).toEqual(input);
  });

  it("rejects empty changes, invalid Topic IDs, and caller-supplied endAt", () => {
    expect(
      topicManagementInputSchema.safeParse({
        action: "update",
        topicId: 3,
        changes: {},
      }).success,
    ).toBe(false);
    expect(
      topicManagementInputSchema.safeParse({
        action: "update",
        topicId: 0,
        changes: { prompt: "新しいお題" },
      }).success,
    ).toBe(false);
    expect(
      topicManagementInputSchema.safeParse({
        action: "update",
        topicId: 3,
        changes: { endAt: "2000-01-01T00:37:00+09:00" },
      }).success,
    ).toBe(false);
  });
});
