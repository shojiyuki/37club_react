import { beforeEach, describe, expect, it, vi } from "vitest";
import { drizzle } from "drizzle-orm/mysql2";

vi.mock("../server/db", () => ({ getDb: vi.fn() }));

import { getDb } from "../server/db";
import { DrizzleBlockRepository } from "../server/repositories/block-repository";
import { DrizzleChatRepository } from "../server/repositories/chat-repository";
import { DrizzleFollowRepository } from "../server/repositories/follow-repository";
import { DrizzleParticipationRepository } from "../server/repositories/participation-repository";
import { DrizzlePostsRepository } from "../server/repositories/posts-repository";

type RecordedQuery = { sql: string; params: unknown[] };

class RecordingMySqlClient {
  readonly queries: RecordedQuery[] = [];

  constructor(private readonly selectRows: unknown[][][] = []) {}

  async query(
    query: string | { sql: string },
    params: unknown[] = [],
  ): Promise<[unknown, unknown[]]> {
    const statement = typeof query === "string" ? query : query.sql;
    this.queries.push({ sql: statement, params });
    if (statement.startsWith("select")) {
      return [this.selectRows.shift() ?? [], []];
    }
    return [{ insertId: 1, affectedRows: 1 }, []];
  }
}

function useRecordingDatabase(
  selectRows: unknown[][][] = [],
): RecordingMySqlClient {
  const client = new RecordingMySqlClient(selectRows);
  vi.mocked(getDb).mockResolvedValue(drizzle(client as never));
  return client;
}

beforeEach(() => {
  vi.mocked(getDb).mockReset();
});

describe("moderation policy repositories", () => {
  it("lists unique counterparties from either block direction", async () => {
    const client = useRecordingDatabase([
      [
        [1, 2],
        [3, 1],
        [1, 2],
      ],
    ]);

    await expect(
      new DrizzleBlockRepository().listCounterpartyUserIds(1),
    ).resolves.toEqual([2, 3]);
    expect(client.queries).toEqual([
      {
        sql: "select `blockerUserId`, `blockedUserId` from `userBlocks` where (`userBlocks`.`blockerUserId` = ? or `userBlocks`.`blockedUserId` = ?)",
        params: [1, 1],
      },
    ]);
  });

  it("checks both block directions without exposing which one matched", async () => {
    const client = useRecordingDatabase([[[10]]]);

    await expect(
      new DrizzleBlockRepository().hasEitherDirection(1, 2),
    ).resolves.toBe(true);
    expect(client.queries).toEqual([
      {
        sql: "select `id` from `userBlocks` where ((`userBlocks`.`blockerUserId` = ? and `userBlocks`.`blockedUserId` = ?) or (`userBlocks`.`blockerUserId` = ? and `userBlocks`.`blockedUserId` = ?)) limit ?",
        params: [1, 2, 2, 1, 1],
      },
    ]);
  });

  it("filters hidden Posts and unavailable authors from the current Topic list", async () => {
    const client = useRecordingDatabase([[[20]], []]);

    await expect(
      new DrizzlePostsRepository().findCurrentTopicPosts(1),
    ).resolves.toEqual([]);

    const sql = client.queries[1]?.sql ?? "";
    expect(sql).toContain("`posts`.`hiddenAt` is null");
    expect(sql).toContain("`users`.`suspendedAt` is null");
    expect(sql).toContain("`users`.`deletedAt` is null");
  });

  it("filters a hidden Post and unavailable author from My Post", async () => {
    const client = useRecordingDatabase([[]]);

    await expect(
      new DrizzlePostsRepository().findMyCurrentPost(1),
    ).resolves.toBeUndefined();

    const sql = client.queries[0]?.sql ?? "";
    expect(sql).toContain("`posts`.`hiddenAt` is null");
    expect(sql).toContain("`users`.`suspendedAt` is null");
    expect(sql).toContain("`users`.`deletedAt` is null");
  });

  it("treats a suspended or deleted follow target as missing", async () => {
    const client = useRecordingDatabase([[]]);

    await expect(new DrizzleFollowRepository().userExists(2)).resolves.toBe(
      false,
    );

    const sql = client.queries[0]?.sql ?? "";
    expect(sql).toContain("`users`.`suspendedAt` is null");
    expect(sql).toContain("`users`.`deletedAt` is null");
  });

  it("does not resolve a suspended or deleted Chat target", async () => {
    const client = useRecordingDatabase([[]]);

    await expect(
      new DrizzleChatRepository().findUserById(2),
    ).resolves.toBeUndefined();

    const sql = client.queries[0]?.sql ?? "";
    expect(sql).toContain("`users`.`suspendedAt` is null");
    expect(sql).toContain("`users`.`deletedAt` is null");
  });

  it("treats a suspended or deleted Chat user as missing", async () => {
    const client = useRecordingDatabase([[]]);

    await expect(new DrizzleChatRepository().userExists(2)).resolves.toBe(
      false,
    );

    const sql = client.queries[0]?.sql ?? "";
    expect(sql).toContain("`users`.`suspendedAt` is null");
    expect(sql).toContain("`users`.`deletedAt` is null");
  });

  it("filters suspended or deleted users from the Chat list", async () => {
    const client = useRecordingDatabase([[[20]], [[2]], []]);

    await expect(
      new DrizzleChatRepository().listMutualUsers(1),
    ).resolves.toEqual([]);

    const sql = client.queries[2]?.sql ?? "";
    expect(sql).toContain("`users`.`suspendedAt` is null");
    expect(sql).toContain("`users`.`deletedAt` is null");
  });

  it("ignores hidden Posts and unavailable authors for Chat list images", async () => {
    const client = useRecordingDatabase([[]]);

    await expect(
      new DrizzleChatRepository().findLatestPostImageStorageKey(2),
    ).resolves.toBeNull();

    const sql = client.queries[0]?.sql ?? "";
    expect(sql).toContain("`posts`.`hiddenAt` is null");
    expect(sql).toContain("`users`.`suspendedAt` is null");
    expect(sql).toContain("`users`.`deletedAt` is null");
  });

  it("filters hidden messages and unavailable senders from Chat history", async () => {
    const client = useRecordingDatabase([[]]);

    await expect(
      new DrizzleChatRepository().listMessages(5, 50),
    ).resolves.toEqual([]);

    const sql = client.queries[0]?.sql ?? "";
    expect(sql).toContain("`messages`.`hiddenAt` is null");
    expect(sql).toContain("`users`.`suspendedAt` is null");
    expect(sql).toContain("`users`.`deletedAt` is null");
  });

  it("ignores a hidden latest message or unavailable sender in the Chat list", async () => {
    const client = useRecordingDatabase([[]]);

    await expect(
      new DrizzleChatRepository().findLatestMessage(5),
    ).resolves.toBeUndefined();

    const sql = client.queries[0]?.sql ?? "";
    expect(sql).toContain("`messages`.`hiddenAt` is null");
    expect(sql).toContain("`users`.`suspendedAt` is null");
    expect(sql).toContain("`users`.`deletedAt` is null");
  });

  it("preserves hiddenAt when reactivating and replacing an existing Post", async () => {
    const timestamp = "2026-08-29 00:10:00.000";
    const hiddenAt = "2026-08-29 00:05:00.000";
    const client = useRecordingDatabase([
      [
        [
          9,
          1,
          20,
          11,
          "active",
          timestamp,
          null,
          timestamp,
          timestamp,
          20,
          timestamp,
          timestamp,
          "test",
          35,
          139,
          "red",
          timestamp,
          timestamp,
          11,
          1,
          20,
          "users/1/posts/new.jpg",
          "new",
          hiddenAt,
          timestamp,
          timestamp,
        ],
      ],
    ]);

    await expect(
      new DrizzleParticipationRepository().reactivateParticipation({
        participationId: 9,
        postId: 11,
        imageStorageKey: "users/1/posts/new.jpg",
        caption: "new",
        checkedInAt: new Date("2026-08-29T00:10:00.000Z"),
      }),
    ).resolves.toMatchObject({
      post: { id: 11, hiddenAt: new Date("2026-08-29T00:05:00.000Z") },
    });

    const postUpdateSql =
      client.queries.find(({ sql }) => sql.startsWith("update `posts`"))?.sql ??
      "";
    expect(postUpdateSql).not.toContain("hiddenAt");
  });
});
