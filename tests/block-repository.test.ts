import { beforeEach, describe, expect, it, vi } from "vitest";
import { drizzle } from "drizzle-orm/mysql2";

vi.mock("../server/db", () => ({ getDb: vi.fn() }));

import { getDb } from "../server/db";
import { DrizzleBlockRepository } from "../server/repositories/block-repository";

const NOW = new Date("2026-08-29T00:10:00.000Z");

type RecordedQuery = { sql: string; params: unknown[] };

class RecordingMySqlClient {
  readonly queries: RecordedQuery[] = [];

  constructor(private readonly selectRows: unknown[][] = []) {}

  async query(
    query: string | { sql: string },
    params: unknown[] = [],
  ): Promise<[unknown, unknown[]]> {
    const statement = typeof query === "string" ? query : query.sql;
    this.queries.push({ sql: statement, params });

    if (statement.startsWith("select")) {
      return [this.selectRows, []];
    }
    return [{ insertId: 1, affectedRows: 1 }, []];
  }
}

function useRecordingDatabase(
  selectRows: unknown[][] = [],
): RecordingMySqlClient {
  const client = new RecordingMySqlClient(selectRows);
  vi.mocked(getDb).mockResolvedValue(drizzle(client as never));
  return client;
}

function createBlockedUserRow(): unknown[] {
  return [
    10,
    1,
    2,
    "2026-08-29 00:10:00.000",
    2,
    null,
    "user_2",
    null,
    null,
    "user",
    "2026-08-29 00:10:00.000",
    "2026-08-29 00:10:00.000",
    "2026-08-29 00:10:00.000",
    null,
    null,
  ];
}

beforeEach(() => {
  vi.mocked(getDb).mockReset();
});

describe("DrizzleBlockRepository", () => {
  it("creates a directional block and deletes both follow directions in one transaction", async () => {
    const client = useRecordingDatabase([createBlockedUserRow()]);
    const repository = new DrizzleBlockRepository();

    await expect(
      repository.createAndRemoveFollows(1, 2),
    ).resolves.toMatchObject({
      block: {
        blockerUserId: 1,
        blockedUserId: 2,
        createdAt: NOW,
      },
      user: { id: 2, name: "user_2" },
    });

    expect(client.queries.map(({ sql }) => sql)).toEqual([
      "begin",
      "insert ignore into `userBlocks` (`id`, `blockerUserId`, `blockedUserId`, `createdAt`) values (default, ?, ?, default)",
      "delete from `follows` where ((`follows`.`followerUserId` = ? and `follows`.`followingUserId` = ?) or (`follows`.`followerUserId` = ? and `follows`.`followingUserId` = ?))",
      "select `userBlocks`.`id`, `userBlocks`.`blockerUserId`, `userBlocks`.`blockedUserId`, `userBlocks`.`createdAt`, `users`.`id`, `users`.`openId`, `users`.`name`, `users`.`email`, `users`.`loginMethod`, `users`.`role`, `users`.`createdAt`, `users`.`updatedAt`, `users`.`lastSignedIn`, `users`.`suspendedAt`, `users`.`deletedAt` from `userBlocks` inner join `users` on `userBlocks`.`blockedUserId` = `users`.`id` where (`userBlocks`.`blockerUserId` = ? and `userBlocks`.`blockedUserId` = ?) limit ?",
      "commit",
    ]);
    expect(client.queries.map(({ params }) => params)).toEqual([
      [],
      [1, 2],
      [1, 2, 2, 1],
      [1, 2, 1],
      [],
    ]);
  });

  it("lists only blocks created by the caller", async () => {
    const client = useRecordingDatabase([createBlockedUserRow()]);
    const repository = new DrizzleBlockRepository();

    await expect(repository.listOutgoing(1)).resolves.toMatchObject([
      {
        block: { blockerUserId: 1, blockedUserId: 2 },
        user: { id: 2, name: "user_2" },
      },
    ]);

    expect(client.queries).toEqual([
      {
        sql: "select `userBlocks`.`id`, `userBlocks`.`blockerUserId`, `userBlocks`.`blockedUserId`, `userBlocks`.`createdAt`, `users`.`id`, `users`.`openId`, `users`.`name`, `users`.`email`, `users`.`loginMethod`, `users`.`role`, `users`.`createdAt`, `users`.`updatedAt`, `users`.`lastSignedIn`, `users`.`suspendedAt`, `users`.`deletedAt` from `userBlocks` inner join `users` on `userBlocks`.`blockedUserId` = `users`.`id` where `userBlocks`.`blockerUserId` = ? order by `userBlocks`.`createdAt` desc, `userBlocks`.`id` desc",
        params: [1],
      },
    ]);
  });

  it("removes only the caller's outgoing block", async () => {
    const client = useRecordingDatabase();
    const repository = new DrizzleBlockRepository();

    await expect(repository.removeOutgoing(1, 2)).resolves.toBeUndefined();

    expect(client.queries).toEqual([
      {
        sql: "delete from `userBlocks` where (`userBlocks`.`blockerUserId` = ? and `userBlocks`.`blockedUserId` = ?)",
        params: [1, 2],
      },
    ]);
  });
});
