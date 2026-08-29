import { getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  messages,
  postComments,
  posts,
  reports,
  userBlocks,
  users,
} from "../drizzle/schema";

describe("UGC safety schema", () => {
  it("exposes report and block tables", () => {
    expect(getTableName(reports)).toBe("reports");
    expect(getTableName(userBlocks)).toBe("userBlocks");
    expect(reports.targetType.name).toBe("targetType");
    expect(reports.targetUserId.name).toBe("targetUserId");
    expect(userBlocks.blockerUserId.name).toBe("blockerUserId");
  });

  it("exposes moderation timestamps", () => {
    expect(posts.hiddenAt.name).toBe("hiddenAt");
    expect(postComments.hiddenAt.name).toBe("hiddenAt");
    expect(messages.hiddenAt.name).toBe("hiddenAt");
    expect(users.suspendedAt.name).toBe("suspendedAt");
  });
});
