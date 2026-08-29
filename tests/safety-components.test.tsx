import * as React from "react";
import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { describe, expect, it, vi } from "vitest";

Object.assign(globalThis, { React });

vi.mock("expo-image", () => ({ Image: "Image" }));
vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 16, left: 0, right: 0 }),
}));
vi.mock("react-native", () => ({
  ActivityIndicator: "ActivityIndicator",
  KeyboardAvoidingView: "KeyboardAvoidingView",
  Modal: "Modal",
  Platform: { OS: "ios" },
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  StyleSheet: {
    absoluteFillObject: {},
    create: <T,>(styles: T) => styles,
    hairlineWidth: 1,
  },
  Text: "Text",
  TextInput: "TextInput",
  View: "View",
}));

import {
  getBlockDialogOperationSessionIdentity,
  BlockConfirmDialogContent,
  ReportFormContent,
  SafetyActionMenuContent,
  SafetyPresentation,
  canDismissSafetyModal,
  getBlockDialogErrorMessage,
  getReportSheetOperationSessionIdentity,
  getReportSheetErrorMessage,
  shouldResetBlockDialogState,
  shouldResetReportSheetState,
  type BlockConfirmDialogProps,
  type ReportSheetProps,
} from "../components/safety";
import { createSafetyOperationController } from "../components/safety/safety-operation";
import {
  createPostSafetyTarget,
  createInitialPostSafetyFlowState,
  createPostSafetySessionKey,
  getReportTargetKey,
  reducePostSafetyFlow,
  type PostSafetyFlowEvent,
} from "../components/post-comments/post-safety";
import { PostSafetyInlineStage } from "../components/post-comments/PostSafetyInlineStage";

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

function findByText(node: unknown, text: string): ReactElement | undefined {
  if (!isValidElement(node)) return undefined;
  const props = node.props as { children?: unknown };
  if (Children.toArray(props.children as ReactNode).includes(text)) {
    return node;
  }

  for (const child of Children.toArray(props.children as ReactNode)) {
    const found = findByText(child, text);
    if (found) return found;
  }
  return undefined;
}

function press(element: ReactElement | undefined) {
  expect(element).toBeDefined();
  const props = element?.props as { disabled?: boolean; onPress?: () => void };
  if (!props.disabled) {
    props.onPress?.();
  }
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function findByType(node: unknown, type: string): ReactElement | undefined {
  if (!isValidElement(node)) return undefined;
  if (node.type === type) return node;

  const props = node.props as { children?: unknown };
  for (const child of Children.toArray(props.children as ReactNode)) {
    const found = findByType(child, type);
    if (found) return found;
  }
  return undefined;
}

function findAllByType(node: unknown, type: string): ReactElement[] {
  if (!isValidElement(node)) return [];
  const matches = node.type === type ? [node] : [];
  const props = node.props as { children?: unknown };
  return Children.toArray(props.children as ReactNode).reduce<ReactElement[]>(
    (found, child) => [...found, ...findAllByType(child, type)],
    matches,
  );
}

describe("safety components", () => {
  it("invalidates an old inline report from the outer post identity at commit", async () => {
    const oldSessionKey = createPostSafetySessionKey({
      visible: true,
      postId: "post-1",
    });
    const newSessionKey = createPostSafetySessionKey({
      visible: true,
      postId: "post-2",
    });
    const oldSelection = {
      targetType: "post" as const,
      targetId: "post-1",
      targetLabel: "投稿" as const,
    };
    const newSelection = {
      targetType: "post" as const,
      targetId: "post-2",
      targetLabel: "投稿" as const,
    };
    let state = reducePostSafetyFlow(createInitialPostSafetyFlowState(), {
      type: "open_report",
      selection: oldSelection,
      sessionKey: oldSessionKey,
    });
    const deferred = createDeferred<{ id: string }>();
    const dispatch = (event: PostSafetyFlowEvent) => {
      state = reducePostSafetyFlow(state, event);
    };
    const renderStage = (sessionKey: string) =>
      PostSafetyInlineStage({
        state,
        sessionKey,
        isMutualPost: false,
        report: () => deferred.promise,
        blockUser: vi.fn(),
        dispatch,
        onUnfollow: vi.fn(),
      });
    const oldReportProps = renderStage(oldSessionKey)
      ?.props as ReportSheetProps;
    const controller = createSafetyOperationController(
      getReportSheetOperationSessionIdentity(oldReportProps),
    );
    const running = controller.run({
      operation: () => oldReportProps.onSubmit({ reason: "spam" }),
      onPendingChange: vi.fn(),
      onSuccess: oldReportProps.onSuccess ?? vi.fn(),
      onError: vi.fn(),
    });

    const switchedReportProps = renderStage(newSessionKey)
      ?.props as ReportSheetProps;
    expect(switchedReportProps.visible).toBe(false);
    expect(switchedReportProps.sessionKey).toBe(newSessionKey);
    expect(
      controller.syncSessionIdentity(
        getReportSheetOperationSessionIdentity(switchedReportProps),
      ),
    ).toBe(true);
    state = reducePostSafetyFlow(state, { type: "reset" });
    state = reducePostSafetyFlow(state, {
      type: "open_report",
      selection: newSelection,
      sessionKey: newSessionKey,
    });

    deferred.resolve({ id: "old-report" });
    await running;

    expect(state.stage).toEqual({
      type: "report",
      selection: newSelection,
      sessionKey: newSessionKey,
    });
    expect(state.effect).toBeNull();
  });

  it("invalidates an old inline block when the outer post sheet is hidden", async () => {
    const visibleSessionKey = createPostSafetySessionKey({
      visible: true,
      postId: "post-1",
    });
    const hiddenSessionKey = createPostSafetySessionKey({
      visible: false,
      postId: "post-1",
    });
    let state = reducePostSafetyFlow(createInitialPostSafetyFlowState(), {
      type: "open_block",
      targetUserId: "user-2",
      sessionKey: visibleSessionKey,
    });
    const deferred = createDeferred<{ ok: true }>();
    const dispatch = (event: PostSafetyFlowEvent) => {
      state = reducePostSafetyFlow(state, event);
    };
    const renderStage = (sessionKey: string) =>
      PostSafetyInlineStage({
        state,
        sessionKey,
        isMutualPost: false,
        report: vi.fn(),
        blockUser: () => deferred.promise,
        dispatch,
        onUnfollow: vi.fn(),
      });
    const visibleBlockProps = renderStage(visibleSessionKey)
      ?.props as BlockConfirmDialogProps;
    const controller = createSafetyOperationController(
      getBlockDialogOperationSessionIdentity(visibleBlockProps),
    );
    const running = controller.run({
      operation: visibleBlockProps.onConfirm,
      onPendingChange: vi.fn(),
      onSuccess: visibleBlockProps.onSuccess ?? vi.fn(),
      onError: vi.fn(),
    });

    const hiddenBlockProps = renderStage(hiddenSessionKey)
      ?.props as BlockConfirmDialogProps;
    expect(hiddenBlockProps.visible).toBe(false);
    expect(hiddenBlockProps.sessionKey).toBe(hiddenSessionKey);
    expect(
      controller.syncSessionIdentity(
        getBlockDialogOperationSessionIdentity(hiddenBlockProps),
      ),
    ).toBe(true);
    state = reducePostSafetyFlow(state, { type: "reset" });

    deferred.resolve({ ok: true });
    await running;

    expect(state).toEqual(createInitialPostSafetyFlowState());
  });

  it("selects exact content, author, and block targets for posts and comments", () => {
    expect(
      createPostSafetyTarget({
        targetType: "post",
        targetId: "post-1",
        userId: "user-1",
      }),
    ).toEqual({
      contentReport: {
        targetType: "post",
        targetId: "post-1",
        targetLabel: "投稿",
      },
      userReport: {
        targetType: "user",
        targetId: "user-1",
        targetLabel: "ユーザー",
      },
      blockUserId: "user-1",
    });
    expect(
      createPostSafetyTarget({
        targetType: "post_comment",
        targetId: "comment-1",
        userId: "user-2",
      }),
    ).toEqual({
      contentReport: {
        targetType: "post_comment",
        targetId: "comment-1",
        targetLabel: "コメント",
      },
      userReport: {
        targetType: "user",
        targetId: "user-2",
        targetLabel: "ユーザー",
      },
      blockUserId: "user-2",
    });
    expect(
      getReportTargetKey({
        targetType: "post_comment",
        targetId: "comment-1",
        targetLabel: "コメント",
      }),
    ).toBe("post_comment:comment-1");
    expect(
      getReportTargetKey({
        targetType: "user",
        targetId: "user-2",
        targetLabel: "ユーザー",
      }),
    ).toBe("user:user-2");
  });

  it("renders inline safety content without adding a nested native Modal", () => {
    const inline = SafetyPresentation({
      presentation: "inline",
      visible: true,
      onRequestClose: vi.fn(),
      children: React.createElement("Text", null, "inline safety"),
    });
    const parentModal = React.createElement("Modal", null, inline);

    expect(findAllByType(parentModal, "Modal")).toHaveLength(1);
    expect(findByText(parentModal, "inline safety")).toBeDefined();

    const modal = SafetyPresentation({
      visible: true,
      onRequestClose: vi.fn(),
      children: React.createElement("Text", null, "modal safety"),
    });
    expect(findAllByType(modal, "Modal")).toHaveLength(1);
    expect(findByText(modal, "modal safety")).toBeDefined();
  });

  it("selects inline shared containers for every post safety stage", () => {
    const target = createPostSafetyTarget({
      targetType: "post",
      targetId: "post-1",
      userId: "user-2",
    });
    const initial = createInitialPostSafetyFlowState();
    const sessionKey = createPostSafetySessionKey({
      visible: true,
      postId: "post-1",
    });
    const states = [
      reducePostSafetyFlow(initial, {
        type: "open_menu",
        target,
        sessionKey,
      }),
      reducePostSafetyFlow(initial, {
        type: "open_report",
        selection: target.contentReport,
        sessionKey,
      }),
      reducePostSafetyFlow(initial, {
        type: "open_block",
        targetUserId: target.blockUserId,
        sessionKey,
      }),
    ];

    for (const state of states) {
      const tree = PostSafetyInlineStage({
        state,
        sessionKey,
        isMutualPost: false,
        report: vi.fn().mockResolvedValue({ id: "report-1" }),
        blockUser: vi.fn().mockResolvedValue({ userId: "user-2" }),
        dispatch: vi.fn(),
        onUnfollow: vi.fn(),
      });

      expect(isValidElement(tree)).toBe(true);
      expect((tree?.props as { presentation?: string }).presentation).toBe(
        "inline",
      );
      expect(findAllByType(tree, "Modal")).toHaveLength(0);
    }
  });

  it("allows dismiss only when not submitting", () => {
    expect(canDismissSafetyModal(false)).toBe(true);
    expect(canDismissSafetyModal(true)).toBe(false);
  });

  it("resets report draft on visibility or target key changes", () => {
    const previousTarget = { key: "post:1", label: "投稿" };
    const nextTargetWithSameLabel = { key: "post:2", label: "投稿" };

    expect(
      shouldResetReportSheetState({
        previousVisible: true,
        visible: false,
        previousTargetKey: previousTarget.key,
        targetKey: previousTarget.key,
      }),
    ).toBe(true);
    expect(
      shouldResetReportSheetState({
        previousVisible: false,
        visible: true,
        previousTargetKey: previousTarget.key,
        targetKey: previousTarget.key,
      }),
    ).toBe(true);
    expect(
      shouldResetReportSheetState({
        previousVisible: true,
        visible: true,
        previousTargetKey: previousTarget.key,
        targetKey: nextTargetWithSameLabel.key,
      }),
    ).toBe(true);
    expect(
      shouldResetReportSheetState({
        previousVisible: true,
        visible: true,
        previousTargetKey: previousTarget.key,
        targetKey: previousTarget.key,
      }),
    ).toBe(false);
  });

  it("resets block dialog state on close, reopen, and mode changes", () => {
    expect(
      shouldResetBlockDialogState({
        previousVisible: true,
        visible: false,
        previousMode: "block",
        mode: "block",
      }),
    ).toBe(true);
    expect(
      shouldResetBlockDialogState({
        previousVisible: false,
        visible: true,
        previousMode: "block",
        mode: "block",
      }),
    ).toBe(true);
    expect(
      shouldResetBlockDialogState({
        previousVisible: true,
        visible: true,
        previousMode: "block",
        mode: "unblock",
      }),
    ).toBe(true);
    expect(
      shouldResetBlockDialogState({
        previousVisible: true,
        visible: true,
        previousMode: "block",
        mode: "block",
      }),
    ).toBe(false);
  });

  it("renders only requested safety actions", () => {
    const tree = SafetyActionMenuContent({
      contentReportLabel: "投稿を通報",
      onReportContent: vi.fn(),
      onReportUser: vi.fn(),
      onBlockUser: vi.fn(),
      onClose: vi.fn(),
    });

    expect(findByLabel(tree, "投稿を通報")).toBeDefined();
    expect(findByLabel(tree, "このユーザーを通報")).toBeDefined();
    expect(findByLabel(tree, "このユーザーをブロック")).toBeDefined();
    expect(findByLabel(tree, "フォロー解除")).toBeUndefined();
  });

  it("submits the selected reason and omits empty details", () => {
    const onSubmit = vi.fn();
    const tree = ReportFormContent({
      targetLabel: "投稿",
      selectedReason: "spam",
      details: "",
      isSubmitting: false,
      error: null,
      onSelectReason: vi.fn(),
      onChangeDetails: vi.fn(),
      onSubmit,
      onClose: vi.fn(),
    });

    press(findByLabel(tree, "通報を送信"));

    expect(onSubmit).toHaveBeenCalledWith({
      reason: "spam",
      details: undefined,
    });
  });

  it("passes non-empty details unchanged and exposes reason actions", () => {
    const onSelectReason = vi.fn();
    const onSubmit = vi.fn();
    const tree = ReportFormContent({
      targetLabel: "コメント",
      selectedReason: "other",
      details: "  状況をそのまま伝える  ",
      isSubmitting: false,
      error: null,
      onSelectReason,
      onChangeDetails: vi.fn(),
      onSubmit,
      onClose: vi.fn(),
    });

    press(findByLabel(tree, "スパム"));
    press(findByLabel(tree, "通報を送信"));

    expect(onSelectReason).toHaveBeenCalledWith("spam");
    expect(onSubmit).toHaveBeenCalledWith({
      reason: "other",
      details: "  状況をそのまま伝える  ",
    });
  });

  it("requires a reason and prevents duplicate report submit while submitting", () => {
    const withoutReason = ReportFormContent({
      targetLabel: "メッセージ",
      selectedReason: null,
      details: "details",
      isSubmitting: false,
      error: null,
      onSelectReason: vi.fn(),
      onChangeDetails: vi.fn(),
      onSubmit: vi.fn(),
      onClose: vi.fn(),
    });
    const pendingSubmit = vi.fn();
    const submittingTree = ReportFormContent({
      targetLabel: "メッセージ",
      selectedReason: "harassment",
      details: "details",
      isSubmitting: true,
      error: null,
      onSelectReason: vi.fn(),
      onChangeDetails: vi.fn(),
      onSubmit: pendingSubmit,
      onClose: vi.fn(),
    });

    press(findByLabel(withoutReason, "通報を送信"));
    press(findByLabel(submittingTree, "通報を送信"));

    expect(
      (
        findByLabel(withoutReason, "通報を送信")?.props as {
          disabled?: boolean;
        }
      ).disabled,
    ).toBe(true);
    expect(
      (
        findByLabel(submittingTree, "通報を送信")?.props as {
          disabled?: boolean;
        }
      ).disabled,
    ).toBe(true);
    expect(pendingSubmit).not.toHaveBeenCalled();
  });

  it("renders stable report error guidance without exposing raw messages", () => {
    const tree = ReportFormContent({
      targetLabel: "投稿",
      selectedReason: "spam",
      details: "details",
      isSubmitting: false,
      error: new Error("network down"),
      onSelectReason: vi.fn(),
      onChangeDetails: vi.fn(),
      onSubmit: vi.fn(),
      onClose: vi.fn(),
    });

    expect(findByText(tree, getReportSheetErrorMessage())).toBeDefined();
    expect(findByText(tree, "network down")).toBeUndefined();
  });

  it("renders block mode copy and handles confirm and cancel", () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    const tree = BlockConfirmDialogContent({
      mode: "block",
      isSubmitting: false,
      error: null,
      onConfirm,
      onClose,
    });

    expect(
      findByText(
        tree,
        "相互のフォローが解除され、投稿とチャットが表示されなくなります。解除してもフォローは戻りません。",
      ),
    ).toBeDefined();
    expect(findByLabel(tree, "ブロックする")).toBeDefined();
    expect(findByLabel(tree, "キャンセル")).toBeDefined();

    press(findByLabel(tree, "ブロックする"));
    press(findByLabel(tree, "キャンセル"));

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("renders block dialog in a scrollable bounded structure with stable error guidance", () => {
    const tree = BlockConfirmDialogContent({
      mode: "block",
      isSubmitting: false,
      error: new Error("server exploded"),
      onConfirm: vi.fn(),
      onClose: vi.fn(),
    });

    const scrollView = findByType(tree, "ScrollView");

    expect(scrollView).toBeDefined();
    expect(
      (
        scrollView?.props as {
          contentContainerStyle?: unknown;
        }
      ).contentContainerStyle,
    ).toBeDefined();
    expect(findByText(tree, getBlockDialogErrorMessage())).toBeDefined();
    expect(findByText(tree, "server exploded")).toBeUndefined();
  });

  it("renders unblock mode copy and disables actions while submitting", () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    const tree = BlockConfirmDialogContent({
      mode: "unblock",
      isSubmitting: true,
      error: null,
      onConfirm,
      onClose,
    });

    expect(
      findByText(tree, "ブロックを解除しても以前のフォローは戻りません。"),
    ).toBeDefined();
    expect(findByLabel(tree, "解除する")).toBeDefined();

    press(findByLabel(tree, "解除する"));
    press(findByLabel(tree, "キャンセル"));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
