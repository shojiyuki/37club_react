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
    create: <T,>(styles: T) => styles,
    hairlineWidth: 1,
  },
  Text: "Text",
  TextInput: "TextInput",
  View: "View",
}));

import { PostCommentsPanel } from "../components/post-comments/PostCommentsPanel";

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
  return undefined;
}

describe("PostCommentsPanel", () => {
  it("閉じるbuttonでPost詳細へ戻る", () => {
    const onBackToPost = vi.fn();
    const tree = PostCommentsPanel({
      post: {
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
      },
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
      onBackToPost,
    });
    const closeButton = findElementByAccessibilityLabel(
      tree,
      "コメントを閉じる",
    );

    expect(closeButton).toBeDefined();
    const closeButtonProps = closeButton?.props as { onPress?: () => void };
    closeButtonProps.onPress?.();
    expect(onBackToPost).toHaveBeenCalledOnce();
  });
});
