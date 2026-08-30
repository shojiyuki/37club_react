import * as React from "react";
import { act } from "react";
// @ts-expect-error react-dom is a direct dependency, but this app does not install its optional type package.
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

Object.assign(globalThis, { React });

const runtime = vi.hoisted(() => ({
  alert: vi.fn(),
  appStateChange: null as null | ((state: string) => void),
  appStateRemove: vi.fn(),
  chatUsers: [] as Array<{
    id: string;
    name: string;
    lastMessage: string;
    hasUnread: boolean;
  }>,
  flatList: null as null | {
    data: unknown[];
    refreshControl?: React.ReactElement<{
      onRefresh?: () => void;
      refreshing?: boolean;
      tintColor?: string;
    }>;
  },
  isRefreshing: false,
  focusEffect: null as null | (() => void | (() => void)),
  refreshChatList: vi.fn<() => Promise<{ isError: boolean; error?: Error }>>(),
}));

vi.mock("expo-image", () => ({ Image: () => null }));
vi.mock("expo-router", () => ({
  router: { push: vi.fn() },
  useFocusEffect: (effect: typeof runtime.focusEffect) => {
    runtime.focusEffect = effect;
  },
}));
vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
vi.mock("@/components/LiveTimerHeader", () => ({
  LiveTimerHeaderTicking: () => null,
}));
vi.mock("@/hooks/use-chat-list", () => ({
  useChatList: () => ({
    chatUsers: runtime.chatUsers,
    isRefreshing: runtime.isRefreshing,
    refreshChatList: runtime.refreshChatList,
  }),
}));
vi.mock("@/lib/app-mode-context", () => ({
  useAppMode: () => ({ activeTopicStartAt: null }),
}));
vi.mock("react-native", async () => {
  const ReactModule = await import("react");
  const Passthrough = ({ children }: { children?: React.ReactNode }) =>
    ReactModule.createElement(ReactModule.Fragment, null, children);
  return {
    Alert: { alert: runtime.alert },
    AppState: {
      addEventListener: (
        _event: string,
        listener: NonNullable<typeof runtime.appStateChange>,
      ) => {
        runtime.appStateChange = listener;
        return { remove: runtime.appStateRemove };
      },
    },
    FlatList: (props: NonNullable<typeof runtime.flatList>) => {
      runtime.flatList = props;
      return null;
    },
    RefreshControl: () => null,
    Pressable: Passthrough,
    StyleSheet: { create: <T,>(styles: T) => styles },
    Text: () => null,
    View: Passthrough,
  };
});

import ChatListScreen from "../app/(tabs)/chat-list";

function createContainer() {
  const testWindow: Record<string, unknown> = {
    event: undefined,
    HTMLIFrameElement: class {},
  };
  const testDocument = {
    nodeType: 9,
    activeElement: null,
    body: {},
    defaultView: testWindow,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  };
  testWindow.document = testDocument;
  Object.assign(globalThis, {
    window: testWindow,
    document: testDocument,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  return {
    nodeType: 1,
    tagName: "DIV",
    namespaceURI: "http://www.w3.org/1999/xhtml",
    ownerDocument: testDocument,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    appendChild: () => undefined,
    removeChild: () => undefined,
  } as unknown as Element;
}

describe("mounted chat list refresh", () => {
  let root: Root;

  beforeEach(async () => {
    runtime.alert.mockReset();
    runtime.appStateChange = null;
    runtime.appStateRemove.mockReset();
    runtime.chatUsers = [];
    runtime.flatList = null;
    runtime.focusEffect = null;
    runtime.isRefreshing = false;
    runtime.refreshChatList.mockReset();
    root = createRoot(createContainer());
    await act(async () => {
      root.render(<ChatListScreen />);
    });
  });

  afterEach(() => {
    act(() => root.unmount());
  });

  it("keeps an empty list refreshable", async () => {
    runtime.refreshChatList.mockResolvedValue({ isError: false });

    expect(runtime.flatList?.data).toEqual([]);
    await act(async () => {
      runtime.flatList?.refreshControl?.props.onRefresh?.();
    });

    expect(runtime.refreshChatList).toHaveBeenCalledOnce();
  });

  it("shows a notice when refresh fails", async () => {
    runtime.refreshChatList.mockResolvedValue({
      isError: true,
      error: new Error("NETWORK_ERROR"),
    });

    await act(async () => {
      runtime.flatList?.refreshControl?.props.onRefresh?.();
    });

    expect(runtime.alert).toHaveBeenCalledWith(
      "更新できませんでした",
      "時間をおいてもう一度お試しください",
    );
    expect(runtime.flatList?.refreshControl?.props.tintColor).toBe("#00D8FF");
  });

  it("refreshes on screen focus and when the focused app returns active", async () => {
    runtime.refreshChatList.mockResolvedValue({ isError: false });

    const lifecycle: { cleanup?: () => void } = {};
    await act(async () => {
      lifecycle.cleanup = runtime.focusEffect?.() || undefined;
      await Promise.resolve();
    });

    expect(runtime.refreshChatList).toHaveBeenCalledOnce();

    await act(async () => {
      runtime.appStateChange?.("background");
      await Promise.resolve();
    });
    expect(runtime.refreshChatList).toHaveBeenCalledOnce();

    await act(async () => {
      runtime.appStateChange?.("active");
      await Promise.resolve();
    });
    expect(runtime.refreshChatList).toHaveBeenCalledTimes(2);

    lifecycle.cleanup?.();
    expect(runtime.appStateRemove).toHaveBeenCalledOnce();
  });

  it("keeps automatic refresh failures silent", async () => {
    runtime.refreshChatList.mockResolvedValue({
      isError: true,
      error: new Error("NETWORK_ERROR"),
    });

    await act(async () => {
      runtime.focusEffect?.();
      await Promise.resolve();
    });

    expect(runtime.alert).not.toHaveBeenCalled();
  });
});
