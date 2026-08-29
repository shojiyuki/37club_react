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
vi.mock("react-native", () => ({
  ActivityIndicator: "ActivityIndicator",
  FlatList: "FlatList",
  KeyboardAvoidingView: "KeyboardAvoidingView",
  Platform: { OS: "ios" },
  Pressable: "Pressable",
  RefreshControl: "RefreshControl",
  StyleSheet: {
    create: <T>(styles: T) => styles,
    hairlineWidth: 1,
  },
  Text: "Text",
  TextInput: "TextInput",
  View: "View",
}));

import { PostCommentsPanel } from "../components/post-comments/PostCommentsPanel";
import type { AppPost, AppPostComment } from "../lib/data/types";

const post: AppPost = {
  id: "post-1",
  topicId: "topic-1",
  user: {
    id: "user-1",
    name: "tester",
    followState: "none",
    isMine: true,
  },
  imageUri: "https://example.test/post.jpg",
  caption: "caption",
};

function createComment(
  overrides: Partial<AppPostComment> = {},
): AppPostComment {
  return {
    id: "comment-1",
    postId: "post-1",
    user: { id: "user-2", name: "other", isMine: false },
    body: "comment body",
    createdAt: "2026-08-29T00:00:00.000Z",
    ...overrides,
  };
}

function createPanelProps(
  overrides: Partial<Parameters<typeof PostCommentsPanel>[0]> = {},
): Parameters<typeof PostCommentsPanel>[0] {
  return {
    post,
    comments: [],
    listRef: { current: null },
    inputText: "",
    isLoading: false,
    isRefreshing: false,
    isSending: false,
    error: null,
    sendError: null,
    bottomInset: 0,
    onChangeText: vi.fn(),
    onSend: vi.fn(),
    onRefresh: vi.fn(),
    onRetry: vi.fn(),
    onBackToPost: vi.fn(),
    onOpenCommentActions: vi.fn(),
    ...overrides,
  };
}

function findElementByAccessibilityLabel(
  node: unknown,
  label: string,
): ReactElement | undefined {
  if (!isValidElement(node)) return undefined;
  const props = node.props as {
    accessibilityLabel?: string;
    children?: unknown;
  };
  if (props.accessibilityLabel === label) return node;

  for (const child of Children.toArray(props.children as ReactNode)) {
    const found = findElementByAccessibilityLabel(child, label);
    if (found) return found;
  }

  if (node.type === "FlatList") {
    const flatListProps = node.props as {
      data?: AppPostComment[];
      renderItem?: (input: { item: AppPostComment }) => ReactElement;
    };
    for (const item of flatListProps.data ?? []) {
      const renderedItem = flatListProps.renderItem?.({ item });
      const found = findElementByAccessibilityLabel(renderedItem, label);
      if (found) return found;
    }
  }
  return undefined;
}

function press(element: ReactElement | undefined) {
  expect(element).toBeDefined();
  const props = element?.props as { onPress?: () => void };
  props.onPress?.();
}

describe("PostCommentsPanel", () => {
  it("閉じるbuttonでPost詳細へ戻る", () => {
    const onBackToPost = vi.fn();
    const tree = PostCommentsPanel(createPanelProps({ onBackToPost }));
    const closeButton = findElementByAccessibilityLabel(
      tree,
      "コメントを閉じる",
    );

    expect(closeButton).toBeDefined();
    const closeButtonProps = closeButton?.props as { onPress?: () => void };
    closeButtonProps.onPress?.();
    expect(onBackToPost).toHaveBeenCalledOnce();
  });

  it("shows a safety action only for another user's comment", () => {
    const onOpenCommentActions = vi.fn();
    const otherComment = createComment();
    const tree = PostCommentsPanel(
      createPanelProps({
        comments: [
          otherComment,
          createComment({
            id: "comment-mine",
            user: { id: "user-1", name: "tester", isMine: true },
          }),
        ],
        onOpenCommentActions,
      }),
    );

    press(findElementByAccessibilityLabel(tree, "otherのコメントメニュー"));

    expect(onOpenCommentActions).toHaveBeenCalledWith(
      expect.objectContaining({ id: "comment-1" }),
    );
    expect(
      findElementByAccessibilityLabel(tree, "testerのコメントメニュー"),
    ).toBeUndefined();
  });
});
