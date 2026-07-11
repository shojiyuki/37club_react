import { useMemo } from "react";

import type { AppPost } from "@/lib/data/types";

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
    return userNameParam ?? "ユーザー";
  }, [userNameParam]);

  const contextPost = useMemo<AppPost | undefined>(() => {
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
    return undefined;
  }, [imageUri, postId, userId, userName]);

  return {
    userName,
    contextPost,
    isLoading: false,
    error: null,
  };
}
