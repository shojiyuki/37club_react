import * as React from "react";
import { act } from "react";
// @ts-expect-error react-dom is a direct dependency, but this app does not install its optional type package.
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

Object.assign(globalThis, { React });

const runtime = vi.hoisted(() => ({
  alert: vi.fn(),
  flatLists: [] as Array<{
    data: unknown[];
    refreshControl?: React.ReactElement<{
      onRefresh?: () => void;
      refreshing?: boolean;
      tintColor?: string;
    }>;
  }>,
  refreshPosts: vi.fn<() => Promise<{ isError: boolean; error?: Error }>>(),
}));

vi.mock("expo-image", () => ({ Image: () => null }));
vi.mock("expo-haptics", () => ({
  ImpactFeedbackStyle: { Light: "light" },
  impactAsync: vi.fn(),
}));
vi.mock("expo-router", () => ({ router: { push: vi.fn() } }));
vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
vi.mock("@/components/LiveTimerHeader", () => ({
  LiveTimerHeaderTicking: () => null,
}));
vi.mock("@/components/post-safety/post-safety", () => ({
  createPostSafetyTarget: vi.fn(),
}));
vi.mock("@/components/post-safety/usePostSafetyFlow", () => ({
  usePostSafetyFlow: () => ({
    inlineStage: null,
    openMenu: vi.fn(),
    requestClose: vi.fn(),
  }),
}));
vi.mock("@/hooks/use-blocks", () => ({
  useBlockActions: () => ({ blockUser: vi.fn() }),
}));
vi.mock("@/hooks/use-follow", () => ({
  useFollow: () => ({
    followingPosts: [],
    getFollowState: () => "none",
    updateFollowState: vi.fn(),
  }),
}));
vi.mock("@/hooks/use-posts", () => ({
  usePosts: () => ({ posts: [], refreshPosts: runtime.refreshPosts }),
}));
vi.mock("@/hooks/use-report", () => ({
  useReport: () => ({ report: vi.fn() }),
}));
vi.mock("@/lib/app-mode-context", () => ({
  useAppMode: () => ({ activeTopicStartAt: null }),
}));
vi.mock("react-native-svg", () => ({
  default: () => null,
  Defs: () => null,
  LinearGradient: () => null,
  Path: () => null,
  Rect: () => null,
  Stop: () => null,
}));
vi.mock("react-native-reanimated", async () => {
  const ReactModule = await import("react");
  const Passthrough = ({ children }: { children?: React.ReactNode }) =>
    ReactModule.createElement(ReactModule.Fragment, null, children);
  return {
    default: { View: Passthrough },
    Easing: {
      cubic: "cubic",
      quad: "quad",
      out: (value: unknown) => value,
    },
    useAnimatedStyle: (factory: () => unknown) => factory(),
    useSharedValue: (value: unknown) => ({ value }),
    withTiming: (value: unknown) => value,
  };
});
vi.mock("react-native-gesture-handler", async () => {
  const ReactModule = await import("react");
  const Passthrough = ({ children }: { children?: React.ReactNode }) =>
    ReactModule.createElement(ReactModule.Fragment, null, children);
  const pan = {
    runOnJS: () => pan,
    onEnd: () => pan,
  };
  return { Gesture: { Pan: () => pan }, GestureDetector: Passthrough };
});
vi.mock("react-native", async () => {
  const ReactModule = await import("react");
  const Passthrough = ({ children }: { children?: React.ReactNode }) =>
    ReactModule.createElement(ReactModule.Fragment, null, children);
  const ScrollView = ReactModule.forwardRef(
    ({ children }: { children?: React.ReactNode }, _ref) =>
      ReactModule.createElement(ReactModule.Fragment, null, children),
  );
  return {
    Alert: { alert: runtime.alert },
    Dimensions: { get: () => ({ width: 390, height: 844 }) },
    FlatList: (props: (typeof runtime.flatLists)[number]) => {
      runtime.flatLists.push(props);
      return null;
    },
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
    Pressable: Passthrough,
    RefreshControl: () => null,
    ScrollView,
    StyleSheet: {
      absoluteFillObject: {},
      create: <T,>(styles: T) => styles,
    },
    Text: () => null,
    TouchableWithoutFeedback: Passthrough,
    View: Passthrough,
  };
});

import PostsScreen from "../app/(tabs)/posts";

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

describe("mounted Posts refresh", () => {
  let root: Root;

  beforeEach(async () => {
    runtime.alert.mockReset();
    runtime.flatLists = [];
    runtime.refreshPosts.mockReset();
    root = createRoot(createContainer());
    await act(async () => {
      root.render(<PostsScreen />);
    });
  });

  afterEach(() => {
    act(() => root.unmount());
  });

  it("keeps both empty Post tabs refreshable", async () => {
    runtime.refreshPosts.mockResolvedValue({ isError: false });

    expect(runtime.flatLists).toHaveLength(2);
    expect(runtime.flatLists.map((list) => list.data)).toEqual([[], []]);
    expect(
      runtime.flatLists.every(
        (list) => list.refreshControl?.props.refreshing === false,
      ),
    ).toBe(true);
    expect(
      runtime.flatLists.every(
        (list) => list.refreshControl?.props.tintColor === "#00D8FF",
      ),
    ).toBe(true);

    await act(async () => {
      runtime.flatLists[0]?.refreshControl?.props.onRefresh?.();
    });

    expect(runtime.refreshPosts).toHaveBeenCalledOnce();
  });

  it("shows a notice when Post refresh fails", async () => {
    runtime.refreshPosts.mockResolvedValue({
      isError: true,
      error: new Error("NETWORK_ERROR"),
    });

    await act(async () => {
      runtime.flatLists[1]?.refreshControl?.props.onRefresh?.();
    });

    expect(runtime.alert).toHaveBeenCalledWith(
      "更新できませんでした",
      "時間をおいてもう一度お試しください",
    );
  });
});
