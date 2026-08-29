import * as React from "react";
import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { describe, expect, it, vi } from "vitest";

Object.assign(globalThis, { React });

vi.mock("react-native", () => ({
  FlatList: "FlatList",
  Pressable: "Pressable",
  StyleSheet: { create: <T,>(styles: T) => styles },
  Text: "Text",
  View: "View",
}));

vi.mock("../components/safety", () => ({
  BlockConfirmDialog: "BlockConfirmDialog",
  ReportSheet: "ReportSheet",
  SafetyActionMenu: "SafetyActionMenu",
}));

import { ChatBubble } from "../components/chat/ChatBubble";
import { ChatMessageList } from "../components/chat/ChatMessageList";
import { ChatSafetyStage } from "../components/chat/ChatSafetyStage";
import {
  createChatMessageSafetyTarget,
  createChatSafetySessionKey,
  createChatUserSafetyTarget,
  getChatReportTargetKey,
  isChatUserBlockedError,
  reduceChatSafetyFlow,
  sendChatMessageWithBlockHandling,
  submitChatSafetyBlock,
  submitChatSafetyReport,
  type ChatSafetyFlowState,
} from "../components/chat/chat-safety";

function findByLabel(node: unknown, label: string): ReactElement | undefined {
  if (!isValidElement(node)) return undefined;
  const props = node.props as {
    accessibilityLabel?: string;
    children?: unknown;
  };
  if (props.accessibilityLabel === label) return node;

  for (const child of Children.toArray(props.children as ReactNode)) {
    const found = findByLabel(child, label);
    if (found) return found;
  }
  return undefined;
}

function longPress(element: ReactElement | undefined) {
  expect(element).toBeDefined();
  (element?.props as { onLongPress?: () => void }).onLongPress?.();
}

describe("ChatBubble safety action", () => {
  it("calls message safety action only for a received message", () => {
    const onLongPress = vi.fn();
    const received = ChatBubble({
      message: { id: "m1", senderId: "2", text: "hello" },
      onLongPress,
    });
    const action = findByLabel(received, "メッセージの操作");

    longPress(action);
    expect(onLongPress).toHaveBeenCalledWith(
      expect.objectContaining({ id: "m1" }),
    );
    expect(
      (action?.props as { accessibilityActions?: unknown })
        .accessibilityActions,
    ).toEqual([{ name: "activate", label: "メッセージの操作" }]);
    (
      action?.props as {
        onAccessibilityAction?: (event: {
          nativeEvent: { actionName: string };
        }) => void;
      }
    ).onAccessibilityAction?.({ nativeEvent: { actionName: "activate" } });
    expect(onLongPress).toHaveBeenCalledTimes(2);

    const mine = ChatBubble({
      message: { id: "m2", senderId: "me", text: "hi" },
      onLongPress,
    });
    expect(findByLabel(mine, "メッセージの操作")).toBeUndefined();
  });

  it("forwards the received message action from the message list", () => {
    const onLongPress = vi.fn();
    const list = (
      ChatMessageList as unknown as {
        render: (props: {
          messages: Array<{ id: string; senderId: string; text: string }>;
          onLongPress: () => void;
        }) => ReactElement;
      }
    ).render({
      messages: [{ id: "m1", senderId: "2", text: "hello" }],
      onLongPress,
    });
    const renderItem = (
      list.props as {
        renderItem: (args: {
          item: { id: string; senderId: string; text: string };
        }) => ReactElement;
      }
    ).renderItem;
    const bubble = renderItem({
      item: { id: "m1", senderId: "2", text: "hello" },
    });

    expect((bubble.props as { onLongPress?: unknown }).onLongPress).toBe(
      onLongPress,
    );
  });
});

describe("chat safety flow", () => {
  it("submits a received message report with the message target", async () => {
    const sessionKey = createChatSafetySessionKey({ userId: "2" });
    const target = createChatMessageSafetyTarget({
      id: "m1",
      senderId: "2",
    });
    let state: ChatSafetyFlowState = { stage: { type: "none" }, effect: null };
    state = reduceChatSafetyFlow(state, {
      type: "open_menu",
      target,
      sessionKey,
    });
    state = reduceChatSafetyFlow(state, {
      type: "open_report",
      selection: target.contentReport,
      sessionKey,
    });
    const report = vi.fn().mockResolvedValue({ id: "report-1" });

    await submitChatSafetyReport({
      selection: target.contentReport,
      input: { reason: "spam", details: "unsolicited" },
      report,
    });

    expect(report).toHaveBeenCalledWith({
      targetType: "message",
      targetId: "m1",
      reason: "spam",
      details: "unsolicited",
    });
    expect(getChatReportTargetKey(target.contentReport)).toBe("message:m1");
  });

  it("recognizes only the safe USER_BLOCKED chat access error", () => {
    expect(isChatUserBlockedError(new Error("USER_BLOCKED"))).toBe(true);
    expect(isChatUserBlockedError(new Error("NETWORK_ERROR"))).toBe(false);
    expect(isChatUserBlockedError({ message: "USER_BLOCKED" })).toBe(false);
  });

  it("keeps the draft callback untouched and closes the detail when sending is blocked", async () => {
    const onSent = vi.fn();
    const onUserBlocked = vi.fn();

    const outcome = await sendChatMessageWithBlockHandling({
      sendMessage: vi.fn().mockRejectedValue(new Error("USER_BLOCKED")),
      text: "keep this draft",
      onSent,
      onUserBlocked,
    });

    expect(outcome).toBe("user_blocked");
    expect(onSent).not.toHaveBeenCalled();
    expect(onUserBlocked).toHaveBeenCalledOnce();
  });

  it("rethrows a non-blocked send error without running either completion callback", async () => {
    const error = new Error("NETWORK_ERROR");
    const onSent = vi.fn();
    const onUserBlocked = vi.fn();

    await expect(
      sendChatMessageWithBlockHandling({
        sendMessage: vi.fn().mockRejectedValue(error),
        text: "keep this draft",
        onSent,
        onUserBlocked,
      }),
    ).rejects.toBe(error);
    expect(onSent).not.toHaveBeenCalled();
    expect(onUserBlocked).not.toHaveBeenCalled();
  });

  it("opens only user report and block actions from the chat header", () => {
    const sessionKey = createChatSafetySessionKey({ userId: "2" });
    const target = createChatUserSafetyTarget("2");
    const dispatch = vi.fn();
    const stage = ChatSafetyStage({
      state: {
        stage: { type: "menu", target, sessionKey },
        effect: null,
      },
      sessionKey,
      report: vi.fn(),
      blockUser: vi.fn(),
      dispatch,
    });
    const props = stage?.props as {
      contentReportLabel?: string;
      onReportContent?: () => void;
      onReportUser?: () => void;
      onBlockUser?: () => void;
    };

    expect(props.contentReportLabel).toBeUndefined();
    expect(props.onReportContent).toBeUndefined();
    props.onReportUser?.();
    props.onBlockUser?.();
    expect(dispatch).toHaveBeenNthCalledWith(1, {
      type: "open_report",
      selection: { targetType: "user", targetId: "2", targetLabel: "ユーザー" },
      sessionKey,
    });
    expect(dispatch).toHaveBeenNthCalledWith(2, {
      type: "open_block",
      targetUserId: "2",
      sessionKey,
    });
  });

  it("keeps the newer header user action when a stale message report completes", () => {
    const oldSessionKey = createChatSafetySessionKey({ userId: "2" });
    const newSessionKey = createChatSafetySessionKey({ userId: "3" });
    const messageTarget = createChatMessageSafetyTarget({
      id: "m1",
      senderId: "2",
    });
    const userTarget = createChatUserSafetyTarget("3");
    let state: ChatSafetyFlowState = { stage: { type: "none" }, effect: null };
    state = reduceChatSafetyFlow(state, {
      type: "open_report",
      selection: messageTarget.contentReport,
      sessionKey: oldSessionKey,
    });
    state = reduceChatSafetyFlow(state, {
      type: "open_menu",
      target: userTarget,
      sessionKey: newSessionKey,
    });

    state = reduceChatSafetyFlow(state, {
      type: "report_succeeded",
      targetKey: "message:m1",
      sessionKey: oldSessionKey,
    });

    expect(state).toEqual({
      stage: { type: "menu", target: userTarget, sessionKey: newSessionKey },
      effect: null,
    });
  });

  it("keeps the block stage until the block mutation and invalidation resolve", async () => {
    const deferred = createDeferred<{ userId: string }>();
    const blockUser = vi.fn(() => deferred.promise);
    const pending = submitChatSafetyBlock({ targetUserId: "2", blockUser });

    expect(blockUser).toHaveBeenCalledWith({ targetUserId: "2" });
    let settled = false;
    void pending.then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);

    deferred.resolve({ userId: "2" });
    await pending;
    expect(settled).toBe(true);
  });
});

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}
