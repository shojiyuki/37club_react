import { describe, expect, it } from "vitest";

import type { User } from "../drizzle/schema";
import { appRouter } from "../server/routers";

const user: User = {
  id: 1,
  openId: null,
  name: "user_1",
  email: null,
  loginMethod: null,
  role: "user",
  createdAt: new Date("2026-08-29T00:00:00.000Z"),
  updatedAt: new Date("2026-08-29T00:00:00.000Z"),
  lastSignedIn: new Date("2026-08-29T00:00:00.000Z"),
  suspendedAt: null,
  deletedAt: null,
};

function createCaller(currentUser: User | null = user) {
  return appRouter.createCaller({
    user: currentUser,
    req: { protocol: "http", headers: {} } as never,
    res: { clearCookie: () => undefined } as never,
  });
}

describe("blocks router", () => {
  it("requires authentication for block list", async () => {
    await expect(createCaller(null).blocks.list()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it.each([0, -1, 1.5])(
    "rejects invalid block target %s",
    async (targetUserId) => {
      await expect(
        createCaller().blocks.create({ targetUserId } as never),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
    },
  );
});

describe("reports router", () => {
  const validInput = {
    targetType: "post" as const,
    targetId: 10,
    reason: "spam" as const,
  };

  it("requires authentication", async () => {
    await expect(
      createCaller(null).reports.create(validInput),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it.each([
    { ...validInput, targetType: "profile" },
    { ...validInput, targetType: "post_comment" },
    { ...validInput, reason: "dislike" },
  ])("rejects invalid report enums", async (input) => {
    await expect(
      createCaller().reports.create(input as never),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects a non-positive target ID", async () => {
    await expect(
      createCaller().reports.create({ ...validInput, targetId: 0 }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects details longer than 500 characters", async () => {
    await expect(
      createCaller().reports.create({
        ...validInput,
        details: "a".repeat(501),
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("does not accept targetUserId from the caller", async () => {
    await expect(
      createCaller().reports.create({
        ...validInput,
        targetUserId: 999,
      } as never),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
