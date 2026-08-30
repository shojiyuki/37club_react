// Dynamic chat route: /chat/[userId]
// Primary chat detail route; /chat/index.tsx was removed to avoid a duplicate
// user-less chat detail screen.

import * as Haptics from "expo-haptics";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  Alert,
  AppState,
  AppStateStatus,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
} from "react-native";
import {
  ChatContextHeader,
  ChatInputBar,
  ChatMessageList,
} from "../../components/chat";
import { ChatSafetyStage } from "../../components/chat/ChatSafetyStage";
import {
  createChatMessageSafetyTarget,
  createChatSafetySessionKey,
  createChatUserSafetyTarget,
  createInitialChatSafetyFlowState,
  getChatSafetyFlowEffectForSession,
  reduceChatSafetyFlow,
  sendChatMessageWithBlockHandling,
} from "../../components/chat/chat-safety";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LiveTimerHeaderTicking } from "../../components/LiveTimerHeader";
import { useBlockActions } from "../../hooks/use-blocks";
import { useChatContextPost } from "../../hooks/use-chat-context-post";
import { useChatMessages } from "../../hooks/use-chat-messages";
import { useReport } from "../../hooks/use-report";
import { useAppMode } from "../../lib/app-mode-context";

// ─── Constants ───────────────────────────────────────────────────────────────

const COLORS = {
  bg: "#070812",
  neon: "#00D8FF",
};

const LIVE_REMAINING_MS = 4 * 60 * 1000 + 52 * 1000;
const MOCK_START_AT = new Date(
  Date.now() - (37 * 60 * 1000 - LIVE_REMAINING_MS),
).toISOString();

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

  const { messages, sendMessage, refreshMessages, isRefreshing } =
    useChatMessages(userId);
  const [inputText, setInputText] = useState("");
  const flatListRef = useRef<FlatList>(null);
  const shouldScrollAfterRefresh = useRef(false);
  const [refreshScrollRequest, setRefreshScrollRequest] = useState(0);
  const [safetyState, safetyDispatch] = React.useReducer(
    reduceChatSafetyFlow,
    undefined,
    createInitialChatSafetyFlowState,
  );
  const handledSafetyEffect = useRef<typeof safetyState.effect>(null);
  const safetySessionKey = createChatSafetySessionKey({ userId });
  const { report } = useReport();
  const { blockUser } = useBlockActions();

  const scrollToLatestAfterRefresh = useCallback(() => {
    if (!shouldScrollAfterRefresh.current) return;
    shouldScrollAfterRefresh.current = false;
    flatListRef.current?.scrollToEnd({ animated: false });
  }, []);

  const refreshAndRequestLatestMessage = useCallback(async () => {
    const result = await refreshMessages();
    if (result.isError) return result;
    shouldScrollAfterRefresh.current = true;
    setRefreshScrollRequest((current) => current + 1);
    return result;
  }, [refreshMessages]);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      void refreshAndRequestLatestMessage();
      const subscription = AppState.addEventListener(
        "change",
        (state: AppStateStatus) => {
          if (state === "active") void refreshAndRequestLatestMessage();
        },
      );
      return () => subscription.remove();
    }, [refreshAndRequestLatestMessage, userId]),
  );

  React.useEffect(() => {
    if (refreshScrollRequest === 0) return;
    const animationFrame = requestAnimationFrame(scrollToLatestAfterRefresh);
    return () => cancelAnimationFrame(animationFrame);
  }, [refreshScrollRequest, scrollToLatestAfterRefresh]);

  React.useEffect(() => {
    safetyDispatch({ type: "reset" });
  }, [safetySessionKey]);

  React.useEffect(() => {
    const effect = safetyState.effect;
    if (!effect || handledSafetyEffect.current === effect) return;
    handledSafetyEffect.current = effect;
    safetyDispatch({ type: "effect_handled", effect });

    const currentEffect = getChatSafetyFlowEffectForSession(
      safetyState,
      safetySessionKey,
    );
    if (!currentEffect) return;

    if (currentEffect.type === "show_report_success") {
      Alert.alert("通報を受け付けました");
    } else {
      router.back();
    }
  }, [safetySessionKey, safetyState]);

  async function handleSend() {
    const text = inputText.trim();
    if (!text) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await sendChatMessageWithBlockHandling({
      sendMessage,
      text,
      onSent: () => {
        setInputText("");
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      },
      onUserBlocked: () => router.back(),
    });
  }

  async function handleRefresh() {
    if (isRefreshing) return;
    try {
      const result = await refreshAndRequestLatestMessage();
      if (result.isError) throw result.error;
    } catch (error) {
      console.error("[chat] refresh failed", error);
      Alert.alert("更新できませんでした", "時間をおいてもう一度お試しください");
    }
  }

  function handleBack() {
    router.back();
  }

  function handleMessageLongPress(message: (typeof messages)[number]) {
    if (message.senderId === "me") return;
    safetyDispatch({
      type: "open_menu",
      target: createChatMessageSafetyTarget(message),
      sessionKey: safetySessionKey,
    });
  }

  function handleHeaderSafetyAction() {
    if (!userId) return;
    safetyDispatch({
      type: "open_menu",
      target: createChatUserSafetyTarget(userId),
      sessionKey: safetySessionKey,
    });
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
            style={({ pressed }) => [
              styles.backButton,
              pressed && { opacity: 0.6 },
            ]}
            onPress={handleBack}
          >
            <Text style={styles.backArrow}>‹</Text>
          </Pressable>
        }
        trailing={
          userId ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="会話相手の操作"
              style={({ pressed }) => [
                styles.safetyActionButton,
                pressed && { opacity: 0.6 },
              ]}
              onPress={handleHeaderSafetyAction}
            >
              <Text style={styles.safetyActionText}>•••</Text>
            </Pressable>
          ) : undefined
        }
      />

      {/* Message list */}
      <ChatMessageList
        ref={flatListRef}
        messages={messages}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={scrollToLatestAfterRefresh}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        emptyText="最初のメッセージを送ろう"
        onLongPress={handleMessageLongPress}
        onRefresh={() => {
          void handleRefresh();
        }}
        refreshing={isRefreshing}
      />

      {/* Input bar */}
      <ChatInputBar
        value={inputText}
        onChangeText={setInputText}
        onSend={() => {
          void handleSend();
        }}
        bottomInset={Math.max(insets.bottom, 16)}
      />

      <ChatSafetyStage
        state={safetyState}
        sessionKey={safetySessionKey}
        report={report}
        blockUser={blockUser}
        dispatch={safetyDispatch}
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
  safetyActionButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  safetyActionText: {
    color: COLORS.neon,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 1,
  },
  messageList: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 6,
  },
});
