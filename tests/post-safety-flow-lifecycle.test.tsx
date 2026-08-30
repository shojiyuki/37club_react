import * as React from "react";
import { act } from "react";
// @ts-expect-error react-dom is a direct dependency, but this app does not install its optional type package.
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  usePostSafetyFlow,
  type UsePostSafetyFlowParams,
  type UsePostSafetyFlowResult,
} from "../components/post-safety/usePostSafetyFlow";
import type { PostSafetyTarget } from "../components/post-safety/post-safety";

Object.assign(globalThis, { React });

const nativeActions = vi.hoisted(() => new Map<string, () => void>());

vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

vi.mock("react-native", async () => {
  const ReactModule = await import("react");
  const Passthrough = ({ children }: { children?: React.ReactNode }) =>
    ReactModule.createElement(ReactModule.Fragment, null, children);
  const Pressable = ({
    accessibilityLabel,
    onPress,
  }: {
    accessibilityLabel?: string;
    onPress?: () => void;
  }) => {
    if (accessibilityLabel && onPress) {
      nativeActions.set(accessibilityLabel, onPress);
    }
    return null;
  };

  return {
    ActivityIndicator: () => null,
    KeyboardAvoidingView: Passthrough,
    Modal: Passthrough,
    Platform: { OS: "ios" },
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

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

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

const POST_1_TARGET: PostSafetyTarget = {
  contentReport: {
    targetType: "post",
    targetId: "post-1",
    targetLabel: "投稿",
  },
  userReport: {
    targetType: "user",
    targetId: "user-2",
    targetLabel: "ユーザー",
  },
  blockUserId: "user-2",
};

const POST_2_TARGET: PostSafetyTarget = {
  contentReport: {
    targetType: "post",
    targetId: "post-2",
    targetLabel: "投稿",
  },
  userReport: {
    targetType: "user",
    targetId: "user-3",
    targetLabel: "ユーザー",
  },
  blockUserId: "user-3",
};

let currentFlow: UsePostSafetyFlowResult | null = null;

function MountedPostSafetyFlow(props: UsePostSafetyFlowParams) {
  currentFlow = usePostSafetyFlow(props);
  return currentFlow.inlineStage;
}

async function press(label: string) {
  const onPress = nativeActions.get(label);
  if (!onPress) throw new Error(`action not mounted: ${label}`);
  await act(async () => {
    onPress();
  });
}

describe("mounted post safety flow", () => {
  let root: Root;

  beforeEach(() => {
    nativeActions.clear();
    currentFlow = null;
    root = createRoot(createContainer());
  });

  afterEach(() => {
    act(() => root.unmount());
  });

  it("drops a switched post report and notifies once for the new current report", async () => {
    const oldReport = createDeferred<{ id: string }>();
    const currentReport = createDeferred<{ id: string }>();
    const report = vi
      .fn()
      .mockImplementationOnce(() => oldReport.promise)
      .mockImplementationOnce(() => currentReport.promise);
    const onReportSuccess = vi.fn();
    const onClose = vi.fn();
    const baseProps = {
      visible: true,
      isMutualPost: false,
      report,
      blockUser: vi.fn(),
      onUnfollow: vi.fn(),
      onReportSuccess,
      onClose,
    } satisfies Omit<UsePostSafetyFlowParams, "postId">;

    await act(async () => {
      root.render(<MountedPostSafetyFlow {...baseProps} postId="post-1" />);
    });
    await act(async () => currentFlow?.openMenu(POST_1_TARGET));
    await press("投稿を通報");
    await press("スパム");
    await press("通報を送信");

    await act(async () => {
      root.render(<MountedPostSafetyFlow {...baseProps} postId="post-2" />);
    });
    await act(async () => currentFlow?.openMenu(POST_2_TARGET));
    await press("投稿を通報");
    await press("嫌がらせ");
    await press("通報を送信");

    await act(async () => {
      oldReport.resolve({ id: "old-report" });
      await oldReport.promise;
    });

    expect(onReportSuccess).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(report.mock.calls).toEqual([
      [{ targetType: "post", targetId: "post-1", reason: "spam" }],
      [{ targetType: "post", targetId: "post-2", reason: "harassment" }],
    ]);

    await act(async () => {
      currentReport.resolve({ id: "current-report" });
      await currentReport.promise;
    });

    expect(onReportSuccess).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("drops a hidden block and closes once after a new current block resolves", async () => {
    const oldBlock = createDeferred<{ ok: true }>();
    const currentBlock = createDeferred<{ ok: true }>();
    const blockUser = vi
      .fn()
      .mockImplementationOnce(() => oldBlock.promise)
      .mockImplementationOnce(() => currentBlock.promise);
    const onReportSuccess = vi.fn();
    const onClose = vi.fn();
    const baseProps = {
      isMutualPost: false,
      report: vi.fn(),
      blockUser,
      onUnfollow: vi.fn(),
      onReportSuccess,
      onClose,
    } satisfies Omit<UsePostSafetyFlowParams, "postId" | "visible">;

    await act(async () => {
      root.render(
        <MountedPostSafetyFlow {...baseProps} visible postId="post-1" />,
      );
    });
    await act(async () => currentFlow?.openMenu(POST_1_TARGET));
    await press("このユーザーをブロック");
    await press("ブロックする");

    await act(async () => {
      root.render(
        <MountedPostSafetyFlow
          {...baseProps}
          visible={false}
          postId="post-1"
        />,
      );
    });
    await act(async () => {
      oldBlock.resolve({ ok: true });
      await oldBlock.promise;
    });

    expect(onClose).not.toHaveBeenCalled();
    expect(onReportSuccess).not.toHaveBeenCalled();

    await act(async () => {
      root.render(
        <MountedPostSafetyFlow {...baseProps} visible postId="post-2" />,
      );
    });
    await act(async () => currentFlow?.openMenu(POST_2_TARGET));
    await press("このユーザーをブロック");
    await press("ブロックする");

    expect(onClose).not.toHaveBeenCalled();
    expect(blockUser.mock.calls).toEqual([
      [{ targetUserId: "user-2" }],
      [{ targetUserId: "user-3" }],
    ]);

    await act(async () => {
      currentBlock.resolve({ ok: true });
      await currentBlock.promise;
    });

    expect(onClose).toHaveBeenCalledOnce();
    expect(onReportSuccess).not.toHaveBeenCalled();
  });
});
