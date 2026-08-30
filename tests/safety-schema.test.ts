import { getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { REPORT_STATUSES } from "../shared/const";
import {
  messages,
  postComments,
  posts,
  reports,
  userBlocks,
  users,
} from "../drizzle/schema";

describe("UGC safety schema", () => {
  it("shares the report status contract with the database schema", () => {
    expect(REPORT_STATUSES).toEqual([
      "pending",
      "action_taken",
      "dismissed",
    ]);
    expect(reports.status.enumValues).toEqual(REPORT_STATUSES);
  });

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
