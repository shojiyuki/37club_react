import * as React from "react";
import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { describe, expect, it, vi } from "vitest";

Object.assign(globalThis, { React });

vi.mock("expo-router", () => ({ router: { back: vi.fn() } }));
vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
vi.mock("react-native-svg", () => ({ default: "Svg", Path: "Path" }));
vi.mock("../hooks/use-blocks", () => ({
  useBlockedUsers: vi.fn(),
  useBlockActions: vi.fn(),
}));
vi.mock("../components/safety", () => ({
  BlockConfirmDialog: "BlockConfirmDialog",
}));
vi.mock("react-native", () => ({
  ActivityIndicator: "ActivityIndicator",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  StyleSheet: {
    create: <T,>(styles: T) => styles,
    hairlineWidth: 1,
  },
  Text: "Text",
  View: "View",
}));

import { RestrictedAccountsContent } from "../app/my-page/restricted";

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

function findText(node: unknown, text: string): ReactElement | undefined {
  if (!isValidElement(node)) return undefined;
  const props = node.props as { children?: unknown };
  if (Children.toArray(props.children as ReactNode).includes(text)) return node;

  for (const child of Children.toArray(props.children as ReactNode)) {
    const found = findText(child, text);
    if (found) return found;
  }
  return undefined;
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

function press(element: ReactElement | undefined) {
  expect(element).toBeDefined();
  (element?.props as { onPress?: () => void }).onPress?.();
}

function createProps(
  overrides: Partial<Parameters<typeof RestrictedAccountsContent>[0]> = {},
): Parameters<typeof RestrictedAccountsContent>[0] {
  return {
    blockedUsers: [],
    isLoading: false,
    error: null,
    onRetry: vi.fn(),
    onUnblock: vi.fn(),
    ...overrides,
  };
}

describe("RestrictedAccountsContent", () => {
  it("renders outgoing blocked users and requests unblock", () => {
    const onUnblock = vi.fn();
    const tree = RestrictedAccountsContent(
      createProps({
        blockedUsers: [
          {
            userId: "2",
            name: "user_2",
            blockedAt: "2026-08-29T00:00:00.000Z",
          },
        ],
        onUnblock,
      }),
    );

    expect(findText(tree, "@user_2")).toBeDefined();
    expect(findText(tree, "Blocked 2026-08-29")).toBeDefined();
    press(findByLabel(tree, "user_2のブロックを解除"));
    expect(onUnblock).toHaveBeenCalledWith("2");
  });

  it("renders a loading indicator", () => {
    const tree = RestrictedAccountsContent(createProps({ isLoading: true }));

    expect(findByType(tree, "ActivityIndicator")).toBeDefined();
  });

  it("renders a retry action after a list error", () => {
    const onRetry = vi.fn();
    const tree = RestrictedAccountsContent(
      createProps({ error: new Error("NETWORK_ERROR"), onRetry }),
    );

    expect(findText(tree, "Failed to load restricted accounts.")).toBeDefined();
    press(findByLabel(tree, "制限中アカウントを再読み込み"));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("renders the empty state", () => {
    const tree = RestrictedAccountsContent(createProps());

    expect(findText(tree, "No restricted accounts.")).toBeDefined();
  });
});
