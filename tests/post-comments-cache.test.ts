import { describe, expect, it, vi } from "vitest";

vi.mock("../lib/data", () => ({ dataSources: {} }));

import {
  appendUniquePostComment,
  isParticipationAccessError,
  postCommentsQueryKey,
} from "../hooks/use-post-comments";

const comment = {
  id: "1",
  postId: "11",
  user: { id: "1", name: "me", isMine: true },
  body: "hello",
  createdAt: "2026-08-29T00:00:00.000Z",
};

describe("post comment cache", () => {
  it("uses a post-scoped stable key", () => {
    expect(postCommentsQueryKey("11")).toEqual(["post-comments", "11"]);
  });

  it("appends a new comment", () => {
    expect(appendUniquePostComment([], comment)).toEqual([comment]);
  });

  it("does not append the same ID twice", () => {
    expect(appendUniquePostComment([comment], comment)).toEqual([comment]);
  });

  it.each([
    "NO_ACTIVE_PARTICIPATION",
    "POST_NOT_IN_ACTIVE_TOPIC",
    "PARTICIPATION_EXPIRED",
  ])("recognizes participation access error %s", (message) => {
    expect(isParticipationAccessError(new Error(message))).toBe(true);
  });

  it("does not treat an unrelated error as participation expiry", () => {
    expect(isParticipationAccessError(new Error("NETWORK_ERROR"))).toBe(false);
  });
});
