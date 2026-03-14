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
import { useAppMode } from "@/lib/app-mode-context";
import { MOCK_CHAT_MESSAGES, MOCK_POSTS, ChatMessage } from "@/lib/mock-data";

// ─── Constants ───────────────────────────────────────────────────────────────

const COLORS = {
  bg: "#070812",
  surface: "#0E1020",
  surface2: "#13162B",
  neon: "#00F5FF",
  neonBubble: "rgba(0, 245, 255, 0.12)",
  neonBubbleBorder: "rgba(0, 245, 255, 0.25)",
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

// ─── Post Context Header ──────────────────────────────────────────────────────

function PostContextHeader({
  postId,
  userName,
  onBack,
}: {
  postId?: string;
  userName: string;
  onBack: () => void;
}) {
  // Find the post for context; fall back to first post if not found
  const post = postId ? MOCK_POSTS.find((p) => p.id === postId) : MOCK_POSTS[0];
  const imageUri = post?.imageUri ?? MOCK_POSTS[0].imageUri;
  const caption = post?.caption ?? "";

  return (
    <View style={styles.contextHeader}>
      {/* Back button */}
      <Pressable
        style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.6 }]}
        onPress={onBack}
      >
        <Text style={styles.backArrow}>‹</Text>
      </Pressable>

      {/* Post thumbnail */}
      <Image
        source={{ uri: imageUri }}
        style={styles.postThumb}
        contentFit="cover"
      />

      {/* User info */}
      <View style={styles.contextInfo}>
        <Text style={styles.contextUserName} numberOfLines={1}>
          @{userName}
        </Text>
        {caption ? (
          <Text style={styles.contextCaption} numberOfLines={1}>
            {caption}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { isDemo, demoPostedAt } = useAppMode();
  const params = useLocalSearchParams<{
    userId?: string;
    userName?: string;
    postId?: string;
  }>();
  const userName = params.userName ?? "ユーザー";
  const postId = params.postId;

  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_CHAT_MESSAGES);
  const [inputText, setInputText] = useState("");
  const flatListRef = useRef<FlatList>(null);

  function handleSend() {
    const text = inputText.trim();
    if (!text) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const newMsg: ChatMessage = {
      id: `m${Date.now()}`,
      senderId: ME,
      text,
    };
    setMessages((prev) => [...prev, newMsg]);
    setInputText("");
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }

  function handleBack() {
    router.back();
  }

  const renderItem = ({ item }: { item: ChatMessage }) => (
    <ChatBubble message={item} />
  );

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

      {/* Post context header */}
      <PostContextHeader
        postId={postId}
        userName={userName}
        onBack={handleBack}
      />

      {/* Message list */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
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

  // ── Post context header ──
  contextHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.divider,
    gap: 10,
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
  contextInfo: {
    flex: 1,
    gap: 2,
  },
  contextUserName: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  contextCaption: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    letterSpacing: 0.1,
  },

  // ── Messages ──
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

  // ── Input bar ──
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
