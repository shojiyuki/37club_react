import { getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { postComments } from "../drizzle/schema";

describe("postComments schema", () => {
  it("exposes the expected table and columns", () => {
    expect(getTableName(postComments)).toBe("postComments");
    expect([
      postComments.id.name,
      postComments.postId.name,
      postComments.userId.name,
      postComments.body.name,
      postComments.createdAt.name,
    ]).toEqual(["id", "postId", "userId", "body", "createdAt"]);
  });
});
