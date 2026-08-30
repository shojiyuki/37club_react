import { beforeEach, describe, expect, it, vi } from "vitest";

const runtime = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  refetch: vi.fn(),
  sendMessage: vi.fn(),
  setQueryData: vi.fn(),
  useQuery: vi.fn(),
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useCallback: <T extends (...args: never[]) => unknown>(callback: T) =>
      callback,
  };
});

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => runtime.useQuery(options),
  useQueryClient: () => ({
    invalidateQueries: runtime.invalidateQueries,
    setQueryData: runtime.setQueryData,
  }),
}));

vi.mock("@/lib/data", () => ({
  dataSources: {
    chat: {
      list: vi.fn(),
      messages: vi.fn(),
      sendMessage: runtime.sendMessage,
    },
    posts: { getAll: vi.fn() },
  },
}));

import { useChatList } from "../hooks/use-chat-list";
import { useChatMessages } from "../hooks/use-chat-messages";
import { usePosts } from "../hooks/use-posts";

function queryResult(data: unknown) {
  return {
    data,
    error: null,
    isLoading: false,
    isRefetching: true,
    refetch: runtime.refetch,
  };
}

describe("refresh query hook contracts", () => {
  beforeEach(() => {
    runtime.invalidateQueries.mockReset();
    runtime.refetch.mockReset();
    runtime.sendMessage.mockReset();
    runtime.setQueryData.mockReset();
    runtime.useQuery.mockReset();
  });

  it("exposes Post refetch and background refresh state", () => {
    runtime.useQuery.mockReturnValue(queryResult([]));

    const result = usePosts();

    expect(result.refreshPosts).toBe(runtime.refetch);
    expect(result.isRefreshing).toBe(true);
  });

  it("exposes Chat list refetch and background refresh state", () => {
    runtime.useQuery.mockReturnValue(queryResult([]));

    const result = useChatList();

    expect(result.refreshChatList).toBe(runtime.refetch);
    expect(result.isRefreshing).toBe(true);
  });

  it("exposes Chat message refetch and background refresh state", () => {
    runtime.useQuery.mockReturnValue(
      queryResult({
        targetUser: { id: "user-2", name: "user_2" },
        messages: [],
      }),
    );

    const result = useChatMessages("user-2");

    expect(result.refreshMessages).toBe(runtime.refetch);
    expect(result.isRefreshing).toBe(true);
  });

  it("invalidates the Chat list after sending a message", async () => {
    runtime.useQuery.mockReturnValue(
      queryResult({
        targetUser: { id: "user-2", name: "user_2" },
        messages: [],
      }),
    );
    runtime.sendMessage.mockResolvedValue({
      id: "message-1",
      senderId: "me",
      text: "hello",
    });

    const result = useChatMessages("user-2");
    await result.sendMessage("hello");

    expect(runtime.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["chat", "list"],
    });
  });
});
