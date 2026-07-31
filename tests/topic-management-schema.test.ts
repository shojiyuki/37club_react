import { describe, expect, it } from "vitest";

import { topicManagementSelectInputSchema } from "../server/topic-management/topic-management-schema";

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
