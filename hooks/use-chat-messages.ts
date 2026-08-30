import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { dataSources } from "@/lib/data";
import type { AppChatMessage } from "@/lib/data/types";
import { CHAT_LIST_QUERY_KEY } from "./use-chat-list";

export type ChatMessage = AppChatMessage;

export const chatMessagesQueryKey = (userId?: string) =>
  ["chat", "messages", userId ?? ""] as const;

export function useChatMessages(userId?: string) {
  const queryClient = useQueryClient();
  const queryKey = chatMessagesQueryKey(userId);
  const messagesQuery = useQuery({
    queryKey,
    queryFn: () => dataSources.chat.messages({ targetUserId: userId ?? "" }),
    enabled: !!userId,
  });
  const { data, error, isLoading, isRefetching, refetch } = messagesQuery;

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !userId) return;

      const message = await dataSources.chat.sendMessage({
        targetUserId: userId,
        body: trimmed,
      });
      queryClient.setQueryData<
        Awaited<ReturnType<typeof dataSources.chat.messages>>
      >(queryKey, (current) => ({
        targetUser: current?.targetUser ?? { id: userId, name: "ユーザー" },
        messages: [...(current?.messages ?? []), message],
      }));
      void queryClient.invalidateQueries({ queryKey: CHAT_LIST_QUERY_KEY });
    },
    [queryClient, queryKey, userId],
  );

  return {
    messages: data?.messages ?? [],
    sendMessage,
    refreshMessages: refetch,
    isRefreshing: isRefetching,
    isLoading,
    error,
  };
}
