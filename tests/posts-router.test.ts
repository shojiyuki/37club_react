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

describe("posts comment router", () => {
  it("requires authentication", async () => {
    const caller = createCaller(null);

    await expect(caller.posts.comments({ postId: 1 })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it.each([0, -1, 1.5])("rejects invalid postId %s", async (postId) => {
    const caller = createCaller();

    await expect(
      caller.posts.comments({ postId } as never),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects a body longer than 200 characters at the boundary", async () => {
    const caller = createCaller();

    await expect(
      caller.posts.createComment({ postId: 1, body: "a".repeat(201) }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
