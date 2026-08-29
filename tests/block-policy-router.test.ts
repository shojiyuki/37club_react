import { beforeEach, describe, expect, it, vi } from "vitest";
import { drizzle } from "drizzle-orm/mysql2";

vi.mock("../server/db", () => ({ getDb: vi.fn() }));
vi.mock("../server/storage/s3-storage", () => ({
  S3Storage: class {
    createReadUrl(): Promise<string> {
      return Promise.resolve("https://example.test/image");
    }
  },
}));

import type { User } from "../drizzle/schema";
import { getDb } from "../server/db";
import { appRouter } from "../server/routers";

class RecordingMySqlClient {
  constructor(private readonly selectRows: unknown[][][] = []) {}

  async query(query: string | { sql: string }): Promise<[unknown, unknown[]]> {
    const statement = typeof query === "string" ? query : query.sql;
    if (statement.startsWith("select")) {
      return [this.selectRows.shift() ?? [], []];
    }
    return [{ insertId: 1, affectedRows: 1 }, []];
  }
}

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

function createCaller(selectRows: unknown[][][] = []) {
  const client = new RecordingMySqlClient(selectRows);
  vi.mocked(getDb).mockResolvedValue(drizzle(client as never));
  return appRouter.createCaller({
    user,
    req: { protocol: "http", headers: {} } as never,
    res: { clearCookie: () => undefined } as never,
  });
}

beforeEach(() => {
  vi.mocked(getDb).mockReset();
});

function createActiveParticipationRow(): unknown[] {
  const now = "2026-08-29 00:10:00.000";
  return [
    10,
    1,
    20,
    30,
    "active",
    now,
    null,
    now,
    now,
    20,
    now,
    "2027-08-29 00:10:00.000",
    "test",
    35,
    139,
    "red",
    now,
    now,
    30,
    1,
    20,
    "users/1/posts/mine.jpg",
    "mine",
    null,
    now,
    now,
  ];
}

function createPostRow(): unknown[] {
  const now = "2026-08-29 00:10:00.000";
  return [11, 2, 20, "users/2/posts/target.jpg", "target", null, now, now];
}

describe("block policy router mapping", () => {
  it("maps a blocked follow to a direction-neutral FORBIDDEN response", async () => {
    const caller = createCaller([[[1]]]);

    await expect(
      caller.follow.setFollowing({ targetUserId: 2, following: true }),
    ).rejects.toMatchObject({ code: "FORBIDDEN", message: "USER_BLOCKED" });
  });

  it("maps blocked Chat history access to a direction-neutral FORBIDDEN response", async () => {
    const caller = createCaller([[[1]]]);

    await expect(
      caller.chat.messages({ targetUserId: 2 }),
    ).rejects.toMatchObject({ code: "FORBIDDEN", message: "USER_BLOCKED" });
  });

  it("maps a blocked Chat send to a direction-neutral FORBIDDEN response", async () => {
    const caller = createCaller([[[1]]]);

    await expect(
      caller.chat.sendMessage({ targetUserId: 2, body: "hello" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN", message: "USER_BLOCKED" });
  });

  it("maps a blocked comment creation to a direction-neutral FORBIDDEN response", async () => {
    const caller = createCaller([
      [createActiveParticipationRow()],
      [],
      [createPostRow()],
      [[1]],
    ]);

    await expect(
      caller.posts.createComment({ postId: 11, body: "hello" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN", message: "USER_BLOCKED" });
  });
});
