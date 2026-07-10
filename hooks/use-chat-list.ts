import { useQuery } from "@tanstack/react-query";

import { dataSources } from "@/lib/data";
import type { AppChatListItem } from "@/lib/data/types";

export type ChatListItem = AppChatListItem;

export const CHAT_LIST_QUERY_KEY = ["chat", "list"] as const;

export function useChatList() {
  const chatListQuery = useQuery({
    queryKey: CHAT_LIST_QUERY_KEY,
    queryFn: () => dataSources.chat.list(),
  });

  return {
    chatUsers: chatListQuery.data ?? [],
    isLoading: chatListQuery.isLoading,
    error: chatListQuery.error,
  };
}
