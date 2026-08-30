import { beforeEach, describe, expect, it, vi } from "vitest";

const testState = vi.hoisted(() => ({
  blockList: vi.fn(),
  blockCreate: vi.fn(),
  blockRemove: vi.fn(),
  invalidateQueries: vi.fn(),
  useMutation: vi.fn(),
  useMutationState: vi.fn(),
  useQuery: vi.fn(),
  useQueryClient: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useMutation: (options: unknown) => testState.useMutation(options),
  useMutationState: (options: unknown) => testState.useMutationState(options),
  useQuery: (options: unknown) => testState.useQuery(options),
  useQueryClient: () => testState.useQueryClient(),
}));

vi.mock("../lib/data", () => ({
  dataSources: {
    blocks: {
      list: (...args: unknown[]) => testState.blockList(...args),
      create: (...args: unknown[]) => testState.blockCreate(...args),
      remove: (...args: unknown[]) => testState.blockRemove(...args),
    },
  },
}));

async function loadModule() {
  return import("../hooks/use-blocks");
}

describe("safety cache", () => {
  beforeEach(() => {
    vi.resetModules();
    testState.blockList.mockReset().mockResolvedValue([]);
    testState.blockCreate.mockReset().mockResolvedValue({
      userId: "u1",
      name: "user_1",
      blockedAt: "2026-08-29T00:00:00.000Z",
    });
    testState.blockRemove.mockReset().mockResolvedValue({
      targetUserId: "u1",
      removed: true,
    });
    testState.invalidateQueries.mockReset().mockResolvedValue(undefined);
    testState.useQueryClient.mockReset().mockReturnValue({
      invalidateQueries: testState.invalidateQueries,
    });
    testState.useQuery.mockReset().mockImplementation(() => ({
      data: [],
      refetch: vi.fn(),
      isLoading: false,
      error: null,
    }));
    testState.useMutationState.mockReset().mockReturnValue([]);
    testState.useMutation.mockReset().mockImplementation((options: any) => ({
      mutateAsync: async (input: unknown) => {
        const result = await options.mutationFn(input);
        await options.onSuccess?.(result, input, undefined);
        return result;
      },
      error: null,
    }));
  });

  it("uses a stable blocked users key", async () => {
    const { BLOCKS_QUERY_KEY } = await loadModule();

    expect(BLOCKS_QUERY_KEY).toEqual(["blocks", "list"]);
  });

  it("useBlockedUsers wires the list query with the blocked-users key", async () => {
    const { useBlockedUsers } = await loadModule();

    useBlockedUsers(false);

    expect(testState.useQuery).toHaveBeenCalledWith({
      queryKey: ["blocks", "list"],
      queryFn: expect.any(Function),
      enabled: false,
    });
  });

  it("invalidates all four user-visible prefixes after block success", async () => {
    const { useBlockActions } = await loadModule();
    const actions = useBlockActions();

    await actions.blockUser({ targetUserId: "u1" });

    expect(testState.blockList).not.toHaveBeenCalled();
    expect(testState.invalidateQueries.mock.calls).toEqual([
      [{ queryKey: ["blocks", "list"] }],
      [{ queryKey: ["posts", "current-topic"] }],
      [{ queryKey: ["chat", "list"] }],
      [{ queryKey: ["chat", "messages"] }],
    ]);
  });

  it("invalidates all four user-visible prefixes after unblock success", async () => {
    const { useBlockActions } = await loadModule();
    const actions = useBlockActions();

    await actions.unblockUser({ targetUserId: "u1" });

    expect(testState.invalidateQueries.mock.calls).toEqual([
      [{ queryKey: ["blocks", "list"] }],
      [{ queryKey: ["posts", "current-topic"] }],
      [{ queryKey: ["chat", "list"] }],
      [{ queryKey: ["chat", "messages"] }],
    ]);
  });

  it("does not fetch the block list when only block actions are used", async () => {
    const { useBlockActions } = await loadModule();

    useBlockActions();

    expect(testState.useQuery).not.toHaveBeenCalled();
    expect(testState.blockList).not.toHaveBeenCalled();
  });

  it("reads pending target IDs from React Query mutation state per operation", async () => {
    testState.useMutationState
      .mockReturnValueOnce(["u1", "u1", "u2"])
      .mockReturnValueOnce(["u3"]);
    const { useBlockActions } = await loadModule();

    const actions = useBlockActions();

    expect(actions.isBlocking).toBe(true);
    expect(actions.isUnblocking).toBe(true);
    expect(actions.isBlockPendingFor("u1")).toBe(true);
    expect(actions.isBlockPendingFor("u2")).toBe(true);
    expect(actions.isBlockPendingFor("u3")).toBe(false);
    expect(actions.isUnblockPendingFor("u3")).toBe(true);
  });

  it("wires block and unblock mutation state to distinct pending filters", async () => {
    const { BLOCK_MUTATION_KEY, UNBLOCK_MUTATION_KEY, useBlockActions } =
      await loadModule();

    useBlockActions();

    expect(testState.useMutationState.mock.calls).toEqual([
      [
        {
          filters: {
            mutationKey: BLOCK_MUTATION_KEY,
            status: "pending",
          },
          select: expect.any(Function),
        },
      ],
      [
        {
          filters: {
            mutationKey: UNBLOCK_MUTATION_KEY,
            status: "pending",
          },
          select: expect.any(Function),
        },
      ],
    ]);
  });
});
