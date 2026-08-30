import * as React from "react";
import { act } from "react";
// @ts-expect-error react-dom is a direct dependency, but this app does not install its optional type package.
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

Object.assign(globalThis, { React });

const nativeActions = vi.hoisted(() => new Map<string, () => void>());
const runtime = vi.hoisted(() => ({
  alert: vi.fn(),
  appStateChange: null as null | ((state: string) => void),
  appStateRemove: vi.fn(),
  blockUser: vi.fn<(input: { targetUserId: string }) => Promise<unknown>>(),
  chat: {
    messages: [
      { id: "m-received", senderId: "2", text: "received" },
      { id: "m-mine", senderId: "me", text: "mine" },
    ],
    isRefreshing: false,
    refreshMessages: vi.fn<() => Promise<{ isError: boolean }>>(),
    sendMessage: vi.fn<(text: string) => Promise<unknown>>(),
  },
  input: null as null | {
    value: string;
    onChangeText: (value: string) => void;
    onSend: () => void;
  },
  focusEffect: null as null | (() => void | (() => void)),
  list: null as null | {
    onContentSizeChange?: () => void;
    onLongPress?: (message: {
      id: string;
      senderId: string;
      text: string;
    }) => void;
    onRefresh?: () => Promise<void>;
    refreshing?: boolean;
  },
  params: { userId: "2", userName: "Other" },
  report: vi.fn<(input: unknown) => Promise<unknown>>(),
  routerBack: vi.fn(),
  scrollToEnd: vi.fn(),
}));

vi.mock("expo-haptics", () => ({
  ImpactFeedbackStyle: { Light: "light" },
  impactAsync: vi.fn(),
}));

vi.mock("expo-router", () => ({
  router: { back: runtime.routerBack },
  useFocusEffect: (effect: typeof runtime.focusEffect) => {
    runtime.focusEffect = effect;
  },
  useLocalSearchParams: () => runtime.params,
}));

vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

vi.mock("react-native", async () => {
  const ReactModule = await import("react");
  const Passthrough = ({ children }: { children?: React.ReactNode }) =>
    ReactModule.createElement(ReactModule.Fragment, null, children);
  const Pressable = ({
    accessibilityLabel,
    children,
    onPress,
  }: {
    accessibilityLabel?: string;
    children?: React.ReactNode;
    onPress?: () => void;
  }) => {
    if (accessibilityLabel && onPress)
      nativeActions.set(accessibilityLabel, onPress);
    return ReactModule.createElement(ReactModule.Fragment, null, children);
  };

  return {
    ActivityIndicator: () => null,
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
    FlatList: () => null,
    KeyboardAvoidingView: Passthrough,
    Modal: ({
      children,
      visible,
    }: {
      children?: React.ReactNode;
      visible: boolean;
    }) =>
      visible
        ? ReactModule.createElement(ReactModule.Fragment, null, children)
        : null,
    Platform: { OS: "web" },
    Pressable,
    ScrollView: Passthrough,
    StyleSheet: {
      absoluteFillObject: {},
      create: <T,>(styles: T) => styles,
      hairlineWidth: 1,
    },
    Text: () => null,
    TextInput: () => null,
    View: Passthrough,
  };
});

vi.mock("../components/chat", () => ({
  ChatContextHeader: ({
    leading,
    trailing,
  }: {
    leading?: React.ReactNode;
    trailing?: React.ReactNode;
  }) => (
    <>
      {leading}
      {trailing}
    </>
  ),
  ChatInputBar: (
    props: typeof runtime.input extends null
      ? never
      : NonNullable<typeof runtime.input>,
  ) => {
    runtime.input = props;
    return null;
  },
  ChatMessageList: React.forwardRef(
    (
      props: typeof runtime.list extends null
        ? never
        : NonNullable<typeof runtime.list>,
      ref,
    ) => {
      React.useImperativeHandle(ref, () => ({
        scrollToEnd: runtime.scrollToEnd,
      }));
      runtime.list = props;
      return null;
    },
  ),
}));

vi.mock("../components/LiveTimerHeader", () => ({
  LiveTimerHeaderTicking: () => null,
}));

vi.mock("../hooks/use-blocks", () => ({
  useBlockActions: () => ({ blockUser: runtime.blockUser }),
}));

vi.mock("../hooks/use-chat-context-post", () => ({
  useChatContextPost: () => ({ chatContext: { userName: "Other" } }),
}));

vi.mock("../hooks/use-chat-messages", () => ({
  useChatMessages: () => runtime.chat,
}));

vi.mock("../hooks/use-report", () => ({
  useReport: () => ({ report: runtime.report }),
}));

vi.mock("../lib/app-mode-context", () => ({
  useAppMode: () => ({ activeTopicStartAt: null }),
}));

import ChatDetailScreen from "../app/chat/[userId]";

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
    requestAnimationFrame: vi.fn(() => 1),
    cancelAnimationFrame: vi.fn(),
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

async function press(label: string) {
  const onPress = nativeActions.get(label);
  if (!onPress) throw new Error(`action not mounted: ${label}`);
  await act(async () => {
    onPress();
  });
}

describe("mounted chat detail safety flow", () => {
  let root: Root;

  beforeEach(async () => {
    nativeActions.clear();
    runtime.alert.mockReset();
    runtime.appStateChange = null;
    runtime.appStateRemove.mockReset();
    runtime.blockUser.mockReset();
    runtime.chat.isRefreshing = false;
    runtime.chat.refreshMessages.mockReset();
    runtime.chat.sendMessage.mockReset();
    runtime.input = null;
    runtime.list = null;
    runtime.focusEffect = null;
    runtime.report.mockReset();
    runtime.routerBack.mockReset();
    runtime.scrollToEnd.mockReset();
    root = createRoot(createContainer());
    await act(async () => {
      root.render(<ChatDetailScreen />);
    });
  });

  afterEach(() => {
    act(() => root.unmount());
  });

  it("routes the real header action to a user report payload", async () => {
    runtime.report.mockResolvedValue({ id: "report-1" });

    await press("会話相手の操作");
    await press("このユーザーを通報");
    await press("スパム");
    await press("通報を送信");

    expect(runtime.report).toHaveBeenCalledWith({
      targetType: "user",
      targetId: "2",
      reason: "spam",
      details: undefined,
    });
  });

  it("routes the real received-message menu to message, sender report, and sender block targets", async () => {
    runtime.report.mockResolvedValue({ id: "report-1" });
    await act(async () => {
      runtime.list?.onLongPress?.({
        id: "m-received",
        senderId: "2",
        text: "received",
      });
    });
    await press("メッセージを通報");
    await press("スパム");
    await press("通報を送信");

    expect(runtime.report).toHaveBeenCalledWith({
      targetType: "message",
      targetId: "m-received",
      reason: "spam",
      details: undefined,
    });
  });

  it("routes the real received-message menu to the sender user report payload", async () => {
    runtime.report.mockResolvedValue({ id: "report-1" });
    await act(async () => {
      runtime.list?.onLongPress?.({
        id: "m-received",
        senderId: "2",
        text: "received",
      });
    });
    await press("このユーザーを通報");
    await press("スパム");
    await press("通報を送信");

    expect(runtime.report).toHaveBeenCalledWith({
      targetType: "user",
      targetId: "2",
      reason: "spam",
      details: undefined,
    });
  });

  it("does not open the real message safety menu for the current user's message", async () => {
    await act(async () => {
      runtime.list?.onLongPress?.({
        id: "m-mine",
        senderId: "me",
        text: "mine",
      });
    });

    expect(nativeActions.get("メッセージを通報")).toBeUndefined();
  });

  it("waits for the real header block mutation before closing the detail", async () => {
    const deferred = createDeferred<{ userId: string }>();
    runtime.blockUser.mockReturnValue(deferred.promise);

    await press("会話相手の操作");
    await press("このユーザーをブロック");
    await press("ブロックする");

    expect(runtime.blockUser).toHaveBeenCalledWith({ targetUserId: "2" });
    expect(runtime.routerBack).not.toHaveBeenCalled();

    await act(async () => {
      deferred.resolve({ userId: "2" });
      await deferred.promise;
    });

    expect(runtime.routerBack).toHaveBeenCalledOnce();
  });

  it("keeps the real block confirmation open after failure and closes once after retry succeeds", async () => {
    const deferred = createDeferred<{ userId: string }>();
    runtime.blockUser
      .mockRejectedValueOnce(new Error("NETWORK_ERROR"))
      .mockReturnValueOnce(deferred.promise);

    await act(async () => {
      runtime.list?.onLongPress?.({
        id: "m-received",
        senderId: "2",
        text: "received",
      });
    });
    await press("このユーザーをブロック");
    await press("ブロックする");

    expect(runtime.routerBack).not.toHaveBeenCalled();
    await press("ブロックする");
    expect(runtime.blockUser).toHaveBeenNthCalledWith(2, { targetUserId: "2" });
    expect(runtime.routerBack).not.toHaveBeenCalled();

    await act(async () => {
      deferred.resolve({ userId: "2" });
      await deferred.promise;
    });

    expect(runtime.routerBack).toHaveBeenCalledOnce();
  });

  it("preserves the mounted input draft and closes only when blocked send resolves", async () => {
    runtime.chat.sendMessage.mockRejectedValue(new Error("USER_BLOCKED"));
    await act(async () => {
      runtime.input?.onChangeText("draft");
    });
    await act(async () => {
      runtime.input?.onSend();
    });

    expect(runtime.input?.value).toBe("draft");
    expect(runtime.routerBack).toHaveBeenCalledOnce();
  });

  it("clears the mounted input draft only after a successful send", async () => {
    runtime.chat.sendMessage.mockResolvedValue({ id: "m-new" });
    await act(async () => {
      runtime.input?.onChangeText("draft");
    });
    await act(async () => {
      runtime.input?.onSend();
    });

    expect(runtime.input?.value).toBe("");
    expect(runtime.routerBack).not.toHaveBeenCalled();
  });

  it("refreshes messages without clearing the draft and scrolls to the latest message", async () => {
    runtime.chat.refreshMessages.mockResolvedValue({ isError: false });
    await act(async () => {
      runtime.input?.onChangeText("draft");
    });

    await act(async () => {
      await runtime.list?.onRefresh?.();
    });

    expect(runtime.chat.refreshMessages).toHaveBeenCalledOnce();
    expect(runtime.input?.value).toBe("draft");
    expect(runtime.scrollToEnd).not.toHaveBeenCalled();

    await act(async () => {
      runtime.list?.onContentSizeChange?.();
    });

    expect(runtime.scrollToEnd).toHaveBeenCalledWith({ animated: false });
  });

  it("keeps the draft and shows a notice when message refresh fails", async () => {
    runtime.chat.refreshMessages.mockResolvedValue({ isError: true });
    await act(async () => {
      runtime.input?.onChangeText("draft");
    });

    await act(async () => {
      await runtime.list?.onRefresh?.();
    });

    expect(runtime.input?.value).toBe("draft");
    expect(runtime.scrollToEnd).not.toHaveBeenCalled();
    expect(runtime.alert).toHaveBeenCalledWith(
      "更新できませんでした",
      "時間をおいてもう一度お試しください",
    );
  });

  it("refreshes and requests the latest message on focus and foreground return", async () => {
    runtime.chat.refreshMessages.mockResolvedValue({ isError: false });

    const lifecycle: { cleanup?: () => void } = {};
    await act(async () => {
      lifecycle.cleanup = runtime.focusEffect?.() || undefined;
      await Promise.resolve();
    });

    expect(runtime.chat.refreshMessages).toHaveBeenCalledOnce();
    await act(async () => {
      runtime.list?.onContentSizeChange?.();
    });
    expect(runtime.scrollToEnd).toHaveBeenCalledWith({ animated: false });

    await act(async () => {
      runtime.appStateChange?.("background");
      await Promise.resolve();
    });
    expect(runtime.chat.refreshMessages).toHaveBeenCalledOnce();

    await act(async () => {
      runtime.appStateChange?.("active");
      await Promise.resolve();
    });
    expect(runtime.chat.refreshMessages).toHaveBeenCalledTimes(2);

    lifecycle.cleanup?.();
    expect(runtime.appStateRemove).toHaveBeenCalledOnce();
  });
});

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}
