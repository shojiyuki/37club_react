import * as React from "react";
import { act } from "react";
// @ts-expect-error react-dom is a direct dependency, but this app does not install its optional type package.
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/data", () => ({
  dataSources: {
    follow: { setFollowing: vi.fn() },
  },
}));

vi.mock("@/hooks/use-posts", () => ({
  POSTS_QUERY_KEY: ["posts", "list"],
}));

import { useFollow } from "../hooks/use-follow";
import type { AppPost } from "../lib/data/types";

Object.assign(globalThis, { React });

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

function createPost(followState: AppPost["user"]["followState"]): AppPost {
  return {
    id: "post-1",
    user: {
      id: "user-2",
      name: "user_2",
      followState,
    },
    imageUri: "https://example.test/post.jpg",
    caption: "test",
    topicId: "topic-1",
  };
}

let currentFollow: ReturnType<typeof useFollow> | null = null;

function MountedFollow({ posts }: { posts: AppPost[] }) {
  currentFollow = useFollow(posts);
  return null;
}

describe("mounted follow state cache", () => {
  let root: Root;
  let queryClient: QueryClient;

  beforeEach(() => {
    currentFollow = null;
    root = createRoot(createContainer());
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    queryClient.clear();
  });

  async function render(posts: AppPost[]) {
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <MountedFollow posts={posts} />
        </QueryClientProvider>,
      );
    });
  }

  it("reconciles an existing user's local state when refreshed posts change it", async () => {
    const mutualPost = createPost("mutual");
    await render([mutualPost]);

    expect(currentFollow?.getFollowState(mutualPost)).toBe("mutual");
    expect(currentFollow?.followingPosts).toHaveLength(1);

    const refreshedPost = createPost("none");
    await render([refreshedPost]);

    expect(currentFollow?.getFollowState(refreshedPost)).toBe("none");
    expect(currentFollow?.followingPosts).toEqual([]);
  });
});
