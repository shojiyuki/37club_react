// Dynamic chat route: /chat/[userId]
// Primary chat detail route; /chat/index.tsx was removed to avoid a duplicate
// user-less chat detail screen.

import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
} from "react-native";
import { ChatContextHeader, ChatInputBar, ChatMessageList } from "@/components/chat";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LiveTimerHeaderTicking } from "@/components/LiveTimerHeader";
import { useChatContextPost } from "@/hooks/use-chat-context-post";
import { useChatMessages, type ChatMessage } from "@/hooks/use-chat-messages";
import { useAppMode } from "@/lib/app-mode-context";

// ─── Constants ───────────────────────────────────────────────────────────────

const COLORS = {
  bg: "#070812",
  neon: "#00D8FF",
};

const LIVE_REMAINING_MS = 4 * 60 * 1000 + 52 * 1000;
const MOCK_START_AT = new Date(Date.now() - (37 * 60 * 1000 - LIVE_REMAINING_MS)).toISOString();

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ChatDetailScreen() {
  const insets = useSafeAreaInsets();
  const { activeTopicStartAt } = useAppMode();
  const params = useLocalSearchParams<{
    userId?: string;
    userName?: string;
    imageUri?: string;
    postId?: string;
  }>();

  const userId = params.userId ?? "";
  const postId = params.postId;
  const { chatContext } = useChatContextPost({
    userId,
    userName: params.userName,
    imageUri: params.imageUri,
    postId,
  });

  const { messages, sendMessage } = useChatMessages(userId);
  const [inputText, setInputText] = useState("");
  const flatListRef = useRef<FlatList>(null);

  function handleSend() {
    const text = inputText.trim();
    if (!text) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    sendMessage(text);
    setInputText("");
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }

  function handleBack() {
    router.back();
  }

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      {/* LIVE Timer */}
      <LiveTimerHeaderTicking startAt={activeTopicStartAt ?? MOCK_START_AT} />

      <ChatContextHeader
        userName={chatContext.userName}
        imageUri={chatContext.imageUri}
        caption={chatContext.caption}
        horizontalPadding={12}
        leading={
          <Pressable
            style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.6 }]}
            onPress={handleBack}
          >
            <Text style={styles.backArrow}>‹</Text>
          </Pressable>
        }
      />

      {/* Message list */}
      <ChatMessageList
        ref={flatListRef}
        messages={messages}
        contentContainerStyle={styles.messageList}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        emptyText="最初のメッセージを送ろう"
      />

      {/* Input bar */}
      <ChatInputBar
        value={inputText}
        onChangeText={setInputText}
        onSend={handleSend}
        bottomInset={Math.max(insets.bottom, 16)}
      />
    </KeyboardAvoidingView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  backArrow: {
    color: COLORS.neon,
    fontSize: 28,
    fontWeight: "300",
    lineHeight: 32,
  },
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 6,
  },
});
