import { useCallback, useEffect, useState } from "react";

import {
  MOCK_CHAT_BY_USER,
  type ChatMessage,
} from "@/lib/mock-data";

const ME = "me";

function getMockMessages(userId?: string): ChatMessage[] {
  if (!userId) return [];
  return [...(MOCK_CHAT_BY_USER[userId] ?? [])];
}

export function useChatMessages(userId?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => getMockMessages(userId));

  const resetMessages = useCallback(() => {
    setMessages(getMockMessages(userId));
  }, [userId]);

  useEffect(() => {
    resetMessages();
  }, [resetMessages]);

  const sendMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const newMessage: ChatMessage = {
      id: `m${Date.now()}`,
      senderId: ME,
      text: trimmed,
    };
    setMessages((prev) => [...prev, newMessage]);
  }, []);

  return {
    messages,
    sendMessage,
    resetMessages,
    isLoading: false,
    error: null,
  };
}
