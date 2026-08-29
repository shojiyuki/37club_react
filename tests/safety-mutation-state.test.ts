import { MutationObserver, QueryClient } from "@tanstack/query-core";
import { describe, expect, it, vi } from "vitest";

vi.mock("../lib/data", () => ({
  dataSources: {
    blocks: {
      list: vi.fn(),
      create: vi.fn(),
      remove: vi.fn(),
    },
  },
}));

import {
  BLOCK_MUTATION_KEY,
  createPendingTargetCounts,
  selectPendingBlockTargetUserId,
} from "../hooks/use-blocks";

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function readPendingCount(queryClient: QueryClient, targetUserId: string): number {
  const pendingTargetIds = queryClient
    .getMutationCache()
    .findAll({
      mutationKey: BLOCK_MUTATION_KEY,
      status: "pending",
    })
    .map(selectPendingBlockTargetUserId);

  return createPendingTargetCounts(pendingTargetIds).get(targetUserId) ?? 0;
}

describe("safety mutation state", () => {
  it("keeps same-target block pending until the last mutation settles", async () => {
    const queryClient = new QueryClient();
    const first = createDeferred<{ ok: true }>();
    const second = createDeferred<{ ok: true }>();
    const mutationFn = vi
      .fn()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);
    const observer = new MutationObserver(queryClient, {
      mutationKey: BLOCK_MUTATION_KEY,
      mutationFn,
    });
    const snapshots: number[] = [];
    const unsubscribe = queryClient.getMutationCache().subscribe(() => {
      snapshots.push(readPendingCount(queryClient, "u1"));
    });

    const firstRun = observer.mutate({ targetUserId: "u1" });
    await Promise.resolve();
    expect(readPendingCount(queryClient, "u1")).toBe(1);

    const secondRun = observer.mutate({ targetUserId: "u1" });
    await Promise.resolve();
    expect(readPendingCount(queryClient, "u1")).toBe(2);

    first.resolve({ ok: true });
    await firstRun;
    expect(readPendingCount(queryClient, "u1")).toBe(1);

    second.resolve({ ok: true });
    await secondRun;
    expect(readPendingCount(queryClient, "u1")).toBe(0);
    expect(snapshots).toContain(1);
    expect(snapshots).toContain(2);
    expect(snapshots.at(-1)).toBe(0);

    unsubscribe();
  });
});
