import { beforeEach, describe, expect, it, vi } from "vitest";
import { drizzle } from "drizzle-orm/mysql2";

vi.mock("../server/db", () => ({ getDb: vi.fn() }));

import { getDb } from "../server/db";
import { DrizzleReportRepository } from "../server/repositories/report-repository";

type RecordedQuery = { sql: string; params: unknown[] };

class RecordingMySqlClient {
  readonly queries: RecordedQuery[] = [];

  constructor(
    private readonly selectRows: unknown[][][] = [],
    private readonly insertError?: Error,
  ) {}

  async query(
    query: string | { sql: string },
    params: unknown[] = [],
  ): Promise<[unknown, unknown[]]> {
    const statement = typeof query === "string" ? query : query.sql;
    this.queries.push({ sql: statement, params });
    if (statement.startsWith("insert") && this.insertError) {
      throw this.insertError;
    }
    if (statement.startsWith("select")) {
      return [this.selectRows.shift() ?? [], []];
    }
    return [{ insertId: 30, affectedRows: 1 }, []];
  }
}

function useRecordingDatabase(
  selectRows: unknown[][][] = [],
  insertError?: Error,
): RecordingMySqlClient {
  const client = new RecordingMySqlClient(selectRows, insertError);
  vi.mocked(getDb).mockResolvedValue(drizzle(client as never));
  return client;
}

function createReportRow(): unknown[] {
  return [
    30,
    1,
    "post",
    10,
    2,
    "spam",
    null,
    "pending",
    null,
    null,
    "2026-08-29 00:10:00.000",
    "2026-08-29 00:10:00.000",
  ];
}

beforeEach(() => {
  vi.mocked(getDb).mockReset();
});

describe("DrizzleReportRepository", () => {
  it.each([
    {
      targetType: "post" as const,
      row: [10, 2, 20, null],
      table: "`posts`",
      hiddenColumns: ["`posts`.`hiddenAt`"],
    },
    {
      targetType: "post_comment" as const,
      row: [10, 2, 20, null],
      table: "`postComments`",
      hiddenColumns: ["`postComments`.`hiddenAt`", "`posts`.`hiddenAt`"],
    },
    {
      targetType: "message" as const,
      row: [10, 2, null, 5],
      table: "`messages`",
      hiddenColumns: ["`messages`.`hiddenAt`"],
    },
    {
      targetType: "user" as const,
      row: [10, 10, null, null],
      table: "`users`",
      hiddenColumns: [] as string[],
    },
  ])(
    "resolves only an available $targetType target and its server-side owner",
    async ({ targetType, row, table, hiddenColumns }) => {
      const client = useRecordingDatabase([[row]]);

      await expect(
        new DrizzleReportRepository().resolveTarget(targetType, 10),
      ).resolves.toEqual({
        targetType,
        targetId: 10,
        targetUserId: targetType === "user" ? 10 : 2,
        topicId:
          targetType === "post" || targetType === "post_comment" ? 20 : null,
        chatRoomId: targetType === "message" ? 5 : null,
      });

      const sql = client.queries[0]?.sql ?? "";
      expect(sql).toContain(`from ${table}`);
      expect(sql).toContain("`users`.`suspendedAt` is null");
      expect(sql).toContain("`users`.`deletedAt` is null");
      for (const column of hiddenColumns) {
        expect(sql).toContain(`${column} is null`);
      }
      expect(client.queries[0]?.params).toContain(10);
    },
  );

  it("checks message-room membership for the authenticated reporter", async () => {
    const client = useRecordingDatabase([[[8]]]);

    await expect(
      new DrizzleReportRepository().isChatRoomMember(5, 1),
    ).resolves.toBe(true);
    expect(client.queries[0]?.sql).toContain("from `chatRoomMembers`");
    expect(client.queries[0]?.params).toEqual([5, 1, 1]);
  });

  it("finds an existing report by reporter and polymorphic target", async () => {
    const client = useRecordingDatabase([[createReportRow()]]);

    await expect(
      new DrizzleReportRepository().findExisting(1, "post", 10),
    ).resolves.toMatchObject({
      id: 30,
      reporterUserId: 1,
      targetType: "post",
      targetId: 10,
    });
    expect(client.queries[0]?.params).toEqual([1, "post", 10, 1]);
  });

  it("inserts the server-resolved owner and reads the created report", async () => {
    const client = useRecordingDatabase([[createReportRow()]]);

    await expect(
      new DrizzleReportRepository().create({
        reporterUserId: 1,
        targetType: "post",
        targetId: 10,
        targetUserId: 2,
        reason: "spam",
        details: null,
      }),
    ).resolves.toMatchObject({ id: 30, targetUserId: 2 });

    expect(client.queries[0]?.sql).toContain("insert into `reports`");
    expect(client.queries[0]?.params).toEqual([1, "post", 10, 2, "spam", null]);
    expect(client.queries[1]?.params).toEqual([30, 1]);
  });

  it("returns the winning row when a concurrent insert hits the unique key", async () => {
    const duplicate = Object.assign(new Error("duplicate"), {
      code: "ER_DUP_ENTRY",
      errno: 1062,
    });
    const client = useRecordingDatabase([[createReportRow()]], duplicate);

    await expect(
      new DrizzleReportRepository().create({
        reporterUserId: 1,
        targetType: "post",
        targetId: 10,
        targetUserId: 2,
        reason: "spam",
        details: null,
      }),
    ).resolves.toMatchObject({ id: 30, reporterUserId: 1 });

    expect(client.queries).toHaveLength(2);
    expect(client.queries[1]?.params).toEqual([1, "post", 10, 1]);
  });
});
