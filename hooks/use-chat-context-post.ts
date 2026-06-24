import { useMemo } from "react";

import {
  MOCK_POSTS,
  MOCK_USERS,
  type MockPost,
} from "@/lib/mock-data";

type UseChatContextPostOptions = {
  userId?: string;
  userName?: string;
  postId?: string;
};

export function useChatContextPost({
  userId,
  userName: userNameParam,
  postId,
}: UseChatContextPostOptions) {
  const userName = useMemo(() => {
    const user = userId ? MOCK_USERS.find((u) => u.id === userId) : undefined;
    return userNameParam ?? user?.name ?? "ユーザー";
  }, [userId, userNameParam]);

  const contextPost = useMemo<MockPost | undefined>(() => {
    if (postId) {
      return MOCK_POSTS.find((post) => post.id === postId);
    }
    if (userId) {
      return MOCK_POSTS.find((post) => post.user.id === userId);
    }
    return undefined;
  }, [postId, userId]);

  return {
    userName,
    contextPost,
    isLoading: false,
    error: null,
  };
}
