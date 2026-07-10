import React from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LiveTimerHeaderTicking } from "@/components/LiveTimerHeader";
import { useChatList } from "@/hooks/use-chat-list";
import { useAppMode } from "@/lib/app-mode-context";

// ─── Constants ───────────────────────────────────────────────────────────────

const COLORS = {
  bg: "#070812",
  surface: "#0E1020",
  surface2: "#13162B",
  neon: "#00D8FF",
  neonGlow: "rgba(0,216,255,0.35)",
  white: "#FFFFFF",
  textMuted: "#6E7594",
  border: "#1A1F3A",
  divider: "rgba(255,255,255,0.06)",
};

const LIVE_REMAINING_MS = 4 * 60 * 1000 + 52 * 1000;
const MOCK_START_AT = new Date(
  Date.now() - (37 * 60 * 1000 - LIVE_REMAINING_MS),
).toISOString();

// Thumbnail size
const THUMB_SIZE = 52;
const THUMB_RADIUS = 12;

// ─── Thumbnail ───────────────────────────────────────────────────────────────

function PostThumbnail({
  imageUri,
  userName,
  hasUnread,
}: {
  imageUri?: string;
  userName: string;
  hasUnread: boolean;
}) {
  const initial = userName[0]?.toUpperCase() ?? "?";

  return (
    <View style={[styles.thumbWrapper, hasUnread && styles.thumbWrapperUnread]}>
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={styles.thumb}
          contentFit="cover"
        />
      ) : (
        // Fallback: rounded-rect placeholder with initial
        <View style={styles.thumbPlaceholder}>
          <Text
            style={[styles.thumbInitial, hasUnread && { color: COLORS.neon }]}
          >
            {initial}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function ChatRow({
  userId,
  userName,
  imageUri,
  lastMessage,
  hasUnread,
  onPress,
}: {
  userId: string;
  userName: string;
  imageUri?: string;
  lastMessage: string;
  hasUnread: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
      onPress={onPress}
    >
      {/* Post thumbnail (rounded rect, not circle) */}
      <PostThumbnail
        imageUri={imageUri}
        userName={userName}
        hasUnread={hasUnread}
      />

      {/* Text block */}
      <View style={styles.textBlock}>
        <Text
          style={[styles.userName, hasUnread && { color: COLORS.neon }]}
          numberOfLines={1}
        >
          @{userName}
        </Text>
        <Text style={styles.lastMsg} numberOfLines={1}>
          {lastMessage || "—"}
        </Text>
      </View>

      {/* Unread dot */}
      {hasUnread && <View style={styles.unreadDot} />}
    </Pressable>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ChatListScreen() {
  const insets = useSafeAreaInsets();
  const { isDemo, demoPostedAt, activeTopicStartAt } = useAppMode();
  const { chatUsers } = useChatList();

  function handleUserPress(userId: string, userName: string, imageUri?: string) {
    router.push({
      pathname: "/chat/[userId]",
      params: { userId, userName, imageUri },
    });
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {isDemo && demoPostedAt ? (
        <LiveTimerHeaderTicking
          startAt={demoPostedAt}
          liveDurationMs={5 * 60 * 1000}
        />
      ) : (
        <LiveTimerHeaderTicking startAt={activeTopicStartAt ?? MOCK_START_AT} />
      )}

      <View style={styles.header}>
        <Text style={styles.headerTitle}>CHAT</Text>
      </View>

      {chatUsers.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>相互フォローのユーザーがいません</Text>
        </View>
      ) : (
        <FlatList
          data={chatUsers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            return (
              <ChatRow
                userId={item.id}
                userName={item.name}
                imageUri={item.imageUri}
                lastMessage={item.lastMessage}
                hasUnread={item.hasUnread}
                onPress={() => handleUserPress(item.id, item.name, item.imageUri)}
              />
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  // ── Post thumbnail (rounded rect) ──
  thumbWrapper: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_RADIUS,
    overflow: "hidden",
    backgroundColor: COLORS.surface2,
  },
  thumbWrapperUnread: {
    // Subtle neon border for unread
    borderWidth: 1.5,
    borderColor: COLORS.neon,
    shadowColor: COLORS.neon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 5,
    elevation: 3,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_RADIUS,
  },
  thumbPlaceholder: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  thumbInitial: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 18,
    fontWeight: "700",
  },
  // ── Text block ──
  textBlock: {
    flex: 1,
    gap: 3,
  },
  userName: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  lastMsg: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 16,
  },
  // ── Unread dot ──
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.neon,
    shadowColor: COLORS.neon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  separator: {
    height: 0.5,
    backgroundColor: COLORS.divider,
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
});
