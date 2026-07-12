import { useMemo } from "react";

type UseChatContextPostOptions = {
  userId?: string;
  userName?: string;
  imageUri?: string;
  postId?: string;
};

export type ChatContext = {
  userId: string;
  userName: string;
  imageUri?: string;
  caption?: string;
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

  const chatContext = useMemo<ChatContext>(() => ({
    userId: userId ?? "",
    userName,
    imageUri,
    postId,
  }), [imageUri, postId, userId, userName]);

  return {
    userName,
    chatContext,
    isLoading: false,
    error: null,
  };
}
