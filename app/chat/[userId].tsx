// Dynamic chat route: /chat/[userId]
// Primary chat detail route; /chat/index.tsx was removed to avoid a duplicate
// user-less chat detail screen.

import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React, { useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LiveTimerHeaderTicking } from "@/components/LiveTimerHeader";
import { useChatMessages } from "@/hooks/use-chat-messages";
import { useAppMode } from "@/lib/app-mode-context";
import {
  MOCK_POSTS,
  MOCK_USERS,
  ChatMessage,
} from "@/lib/mock-data";

// ─── Constants ───────────────────────────────────────────────────────────────

const COLORS = {
  bg: "#070812",
  surface: "#0E1020",
  surface2: "#13162B",
  neon: "#00D8FF",
  neonBubble: "rgba(0,216,255,0.12)",
  neonBubbleBorder: "rgba(0,216,255,0.25)",
  white: "#FFFFFF",
  textSecondary: "#B7BDD6",
  textMuted: "#6E7594",
  border: "#1A1F3A",
  divider: "rgba(255,255,255,0.08)",
};

const ME = "me";
const LIVE_REMAINING_MS = 4 * 60 * 1000 + 52 * 1000;
const MOCK_START_AT = new Date(Date.now() - (37 * 60 * 1000 - LIVE_REMAINING_MS)).toISOString();

// ─── Bubble ───────────────────────────────────────────────────────────────────

function ChatBubble({ message }: { message: ChatMessage }) {
  const isMe = message.senderId === ME;
  return (
    <View style={[styles.bubbleRow, isMe ? styles.bubbleRowMe : styles.bubbleRowThem]}>
      <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
        <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextThem]}>
          {message.text}
        </Text>
      </View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ChatDetailScreen() {
  const insets = useSafeAreaInsets();
  const { isDemo, demoPostedAt } = useAppMode();
  const params = useLocalSearchParams<{
    userId?: string;
    userName?: string;
    postId?: string;
  }>();

  const userId = params.userId ?? "";
  const user = MOCK_USERS.find((u) => u.id === userId);
  const userName = params.userName ?? user?.name ?? "ユーザー";
  const postId = params.postId;

  // Find a post by this user for context header
  const contextPost = postId
    ? MOCK_POSTS.find((p) => p.id === postId)
    : MOCK_POSTS.find((p) => p.user.id === userId);

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
      {isDemo && demoPostedAt ? (
        <LiveTimerHeaderTicking
          startAt={demoPostedAt}
          liveDurationMs={5 * 60 * 1000}
        />
      ) : (
        <LiveTimerHeaderTicking startAt={MOCK_START_AT} />
      )}

      {/* Context header */}
      <View style={styles.contextHeader}>
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.6 }]}
          onPress={handleBack}
        >
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>

        {contextPost ? (
          <Image
            source={{ uri: contextPost.imageUri }}
            style={styles.postThumb}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.postThumb, styles.postThumbFallback]}>
            <Text style={styles.postThumbInitial}>{userName[0]?.toUpperCase()}</Text>
          </View>
        )}

        <View style={styles.contextInfo}>
          <Text style={styles.contextUserName} numberOfLines={1}>
            @{userName}
          </Text>
          {contextPost?.caption ? (
            <Text style={styles.contextCaption} numberOfLines={1}>
              {contextPost.caption}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.contextDivider} />

      {/* Message list */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ChatBubble message={item} />}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Text style={styles.emptyChatText}>最初のメッセージを送ろう</Text>
          </View>
        }
      />

      {/* Input bar */}
      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TextInput
          style={styles.textInput}
          placeholder="メッセージを入力..."
          placeholderTextColor={COLORS.textMuted}
          value={inputText}
          onChangeText={setInputText}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          multiline={false}
        />
        <Pressable
          style={({ pressed }) => [
            styles.sendButton,
            !inputText.trim() && styles.sendButtonDisabled,
            pressed && { opacity: 0.7 },
          ]}
          onPress={handleSend}
          disabled={!inputText.trim()}
        >
          <Text style={styles.sendButtonText}>↑</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  contextHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    gap: 10,
  },
  contextDivider: {
    height: 0.5,
    backgroundColor: COLORS.divider,
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
  postThumb: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: COLORS.surface2,
  },
  postThumbFallback: {
    justifyContent: "center",
    alignItems: "center",
  },
  postThumbInitial: {
    color: COLORS.neon,
    fontSize: 20,
    fontWeight: "700",
  },
  contextInfo: {
    flex: 1,
    gap: 2,
  },
  contextUserName: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  contextCaption: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    letterSpacing: 0.1,
  },
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 6,
  },
  bubbleRow: {
    flexDirection: "row",
    marginVertical: 2,
  },
  bubbleRowMe: {
    justifyContent: "flex-end",
  },
  bubbleRowThem: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "72%",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 16,
  },
  bubbleMe: {
    backgroundColor: COLORS.neonBubble,
    borderBottomRightRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.neonBubbleBorder,
  },
  bubbleThem: {
    backgroundColor: COLORS.surface2,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 22,
  },
  bubbleTextMe: {
    color: COLORS.white,
  },
  bubbleTextThem: {
    color: COLORS.textSecondary,
  },
  emptyChat: {
    paddingTop: 48,
    alignItems: "center",
  },
  emptyChatText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  textInput: {
    flex: 1,
    height: 40,
    backgroundColor: COLORS.surface2,
    borderRadius: 20,
    paddingHorizontal: 16,
    color: COLORS.white,
    fontSize: 15,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.neon,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.neon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.border,
    shadowOpacity: 0,
  },
  sendButtonText: {
    color: COLORS.bg,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 22,
  },
});
