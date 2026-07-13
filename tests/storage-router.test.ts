import { describe, expect, it } from "vitest";

import type { User } from "../drizzle/schema";
import { appRouter } from "../server/routers";

const user: User = {
  id: 1,
  openId: null,
  name: null,
  email: null,
  loginMethod: null,
  role: "user",
  createdAt: new Date("2026-07-09T00:00:00.000Z"),
  updatedAt: new Date("2026-07-09T00:00:00.000Z"),
  lastSignedIn: new Date("2026-07-09T00:00:00.000Z"),
  deletedAt: null,
};

function createCaller(currentUser: User | null = user) {
  return appRouter.createCaller({
    user: currentUser,
    req: { protocol: "http", headers: {} } as never,
    res: { clearCookie: () => undefined } as never,
  });
}

describe("storage router", () => {
  it("requires an authenticated user", async () => {
    const caller = createCaller(null);

    await expect(
      caller.storage.createUploadUrl({
        contentType: "image/jpeg",
        contentLength: 1024,
      }),
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("rejects unsupported image content types before S3 access", async () => {
    const caller = createCaller();

    await expect(
      caller.storage.createUploadUrl({
        contentType: "image/gif",
        contentLength: 1024,
      } as never),
    ).rejects.toBeTruthy();
  });

  it("rejects oversized images before S3 access", async () => {
    const caller = createCaller();

    await expect(
      caller.storage.createUploadUrl({
        contentType: "image/jpeg",
        contentLength: 10 * 1024 * 1024 + 1,
      }),
    ).rejects.toBeTruthy();
  });
});
