import { useMemo } from "react";

import {
  MOCK_POSTS,
  MOCK_USERS,
  type MockPost,
} from "@/lib/mock-data";

type UseChatContextPostOptions = {
  userId?: string;
  userName?: string;
  imageUri?: string;
  postId?: string;
};

export function useChatContextPost({
  userId,
  userName: userNameParam,
  imageUri,
  postId,
}: UseChatContextPostOptions) {
  const userName = useMemo(() => {
    const user = userId ? MOCK_USERS.find((u) => u.id === userId) : undefined;
    return userNameParam ?? user?.name ?? "ユーザー";
  }, [userId, userNameParam]);

  const contextPost = useMemo<MockPost | undefined>(() => {
    if (imageUri) {
      return {
        id: postId ?? `chat-context-${userId ?? "unknown"}`,
        user: {
          id: userId ?? "",
          name: userName,
          followState: "mutual",
        },
        imageUri,
        caption: "",
        topicId: "",
      };
    }
    if (postId) {
      return MOCK_POSTS.find((post) => post.id === postId);
    }
    if (userId) {
      return MOCK_POSTS.find((post) => post.user.id === userId);
    }
    return undefined;
  }, [imageUri, postId, userId, userName]);

  return {
    userName,
    contextPost,
    isLoading: false,
    error: null,
  };
}
