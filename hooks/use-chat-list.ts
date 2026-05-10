import { useMemo } from "react";

import {
  MOCK_CHAT_BY_USER,
  MOCK_POSTS,
  MOCK_USERS,
} from "@/lib/mock-data";

const ME = "me";
const UNREAD_USER_IDS = new Set(["u1"]);

export type ChatListItem = {
  id: string;
  name: string;
  imageUri?: string;
  lastMessage: string;
  hasUnread: boolean;
};

export function useChatList() {
  const chatUsers = useMemo<ChatListItem[]>(() => {
    const userPostImage: Record<string, string> = {};
    for (const post of MOCK_POSTS) {
      if (!userPostImage[post.user.id]) {
        userPostImage[post.user.id] = post.imageUri;
      }
    }

    return MOCK_USERS
      .filter((user) => user.followState === "mutual")
      .map((user) => {
        const history = MOCK_CHAT_BY_USER[user.id] ?? [];
        const last = history[history.length - 1];
        const lastMessage = last
          ? last.senderId === ME
            ? `あなた: ${last.text}`
            : last.text
          : "";

        return {
          id: user.id,
          name: user.name,
          imageUri: userPostImage[user.id],
          lastMessage,
          hasUnread: UNREAD_USER_IDS.has(user.id),
        };
      });
  }, []);

  return {
    chatUsers,
    isLoading: false,
    error: null,
  };
}
