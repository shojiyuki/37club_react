import { Image } from "expo-image";
import type React from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type { AppPost, AppPostComment } from "../../lib/data/types";

export type PostCommentsPanelProps = {
  post: AppPost;
  comments: AppPostComment[];
  listRef: React.RefObject<FlatList<AppPostComment> | null>;
  inputText: string;
  isLoading: boolean;
  isRefreshing: boolean;
  isSending: boolean;
  error: Error | null;
  sendError: Error | null;
  bottomInset: number;
  onChangeText: (value: string) => void;
  onSend: () => void;
  onRefresh: () => void;
  onRetry: () => void;
  onBackToPost: () => void;
};

export function PostCommentsPanel({
  post,
  comments,
  listRef,
  inputText,
  isLoading,
  isRefreshing,
  isSending,
  error,
  sendError,
  bottomInset,
  onChangeText,
  onSend,
  onRefresh,
  onRetry,
  onBackToPost,
}: PostCommentsPanelProps) {
  const sendDisabled = isSending || inputText.trim().length === 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <View style={styles.header}>
        <Image
          source={{ uri: post.imageUri }}
          style={styles.thumbnail}
          contentFit="cover"
        />
        <View style={styles.headerText}>
          <Text style={styles.userName} numberOfLines={1}>
            @{post.user.name}
          </Text>
          {post.caption ? (
            <Text style={styles.caption} numberOfLines={1}>
              {post.caption}
            </Text>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="コメントを閉じる"
          style={({ pressed }) => [
            styles.closeButton,
            pressed && styles.pressed,
          ]}
          onPress={onBackToPost}
        >
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={comments}
        keyExtractor={(comment) => comment.id}
        renderItem={({ item }) => (
          <View style={styles.commentRow}>
            <View style={styles.commentHeader}>
              <Text
                style={[
                  styles.commentUserName,
                  item.user.isMine && styles.mine,
                ]}
                numberOfLines={1}
              >
                @{item.user.name}
              </Text>
              <Text style={styles.commentTime}>
                {new Date(item.createdAt).toLocaleTimeString("ja-JP", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
            <Text style={styles.commentBody}>{item.body}</Text>
          </View>
        )}
        contentContainerStyle={[
          styles.listContent,
          comments.length === 0 && styles.emptyListContent,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#00D8FF"
          />
        }
        ListHeaderComponent={
          error && comments.length > 0 ? (
            <View style={styles.inlineError}>
              <Text style={styles.emptyText}>
                コメントを更新できませんでした
              </Text>
              <Pressable accessibilityRole="button" onPress={onRetry}>
                <Text style={styles.retryText}>再試行</Text>
              </Pressable>
            </View>
          ) : null
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color="#00D8FF" />
          ) : error ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                コメントを取得できませんでした
              </Text>
              <Pressable accessibilityRole="button" onPress={onRetry}>
                <Text style={styles.retryText}>再試行</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.emptyText}>最初のコメントを投稿しよう</Text>
          )
        }
        showsVerticalScrollIndicator={false}
      />

      <View
        style={[styles.inputArea, { paddingBottom: Math.max(bottomInset, 12) }]}
      >
        <View style={styles.inputRow}>
          <TextInput
            value={inputText}
            onChangeText={onChangeText}
            maxLength={200}
            multiline
            placeholder="コメントを入力"
            placeholderTextColor="#6E7594"
            style={styles.input}
          />
          <Pressable
            accessibilityRole="button"
            disabled={sendDisabled}
            style={({ pressed }) => [
              styles.sendButton,
              sendDisabled && styles.sendButtonDisabled,
              pressed && !sendDisabled && styles.pressed,
            ]}
            onPress={onSend}
          >
            {isSending ? (
              <ActivityIndicator color="#070812" size="small" />
            ) : (
              <Text style={styles.sendText}>送信</Text>
            )}
          </Pressable>
        </View>
        <View style={styles.inputMeta}>
          <Text style={styles.sendError}>
            {sendError ? "コメントを送信できませんでした" : ""}
          </Text>
          <Text style={styles.counter}>{inputText.length}/200</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  thumbnail: {
    width: 46,
    height: 46,
    borderRadius: 7,
    backgroundColor: "#13162B",
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  userName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  caption: {
    color: "#B7BDD6",
    fontSize: 12,
  },
  closeButton: {
    width: 34,
    height: 34,
    justifyContent: "center",
    alignItems: "center",
  },
  closeText: {
    color: "#6E7594",
    fontSize: 16,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  commentRow: {
    gap: 5,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  commentUserName: {
    flex: 1,
    color: "#B7BDD6",
    fontSize: 13,
    fontWeight: "700",
  },
  mine: {
    color: "#00D8FF",
  },
  commentTime: {
    color: "#6E7594",
    fontSize: 11,
  },
  commentBody: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: "center",
    gap: 12,
  },
  inlineError: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingBottom: 12,
  },
  emptyText: {
    color: "#6E7594",
    fontSize: 14,
    textAlign: "center",
  },
  retryText: {
    color: "#00D8FF",
    fontSize: 13,
    fontWeight: "700",
  },
  inputArea: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 4,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 96,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#13162B",
    color: "#FFFFFF",
    fontSize: 14,
  },
  sendButton: {
    minWidth: 60,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#00D8FF",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  sendButtonDisabled: {
    opacity: 0.35,
  },
  sendText: {
    color: "#070812",
    fontSize: 13,
    fontWeight: "800",
  },
  inputMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 4,
  },
  sendError: {
    flex: 1,
    color: "#FF7D9A",
    fontSize: 11,
  },
  counter: {
    color: "#6E7594",
    fontSize: 11,
  },
  pressed: {
    opacity: 0.65,
  },
});
