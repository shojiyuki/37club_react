import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { AppPostComment } from "../../lib/data/types";

export type PostCommentPreviewProps = {
  comments: AppPostComment[];
  totalCount: number;
  isLoading: boolean;
  error: Error | null;
  onOpen: () => void;
  onRetry: () => void;
};

export function PostCommentPreview({
  comments,
  totalCount,
  isLoading,
  error,
  onOpen,
  onRetry,
}: PostCommentPreviewProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="コメントを開く"
      style={({ pressed }) => [
        styles.container,
        pressed && styles.containerPressed,
      ]}
      onPress={onOpen}
    >
      <View style={styles.header}>
        <Text style={styles.title}>コメント {totalCount}件</Text>
        <Text style={styles.openLabel}>コメントする</Text>
      </View>

      {isLoading ? (
        <View style={styles.centeredState}>
          <ActivityIndicator color="#00D8FF" size="small" />
        </View>
      ) : error ? (
        <View style={styles.errorRow}>
          <Text style={styles.stateText}>コメントを取得できませんでした</Text>
          <Pressable
            accessibilityRole="button"
            onPress={(event) => {
              event.stopPropagation();
              onRetry();
            }}
          >
            <Text style={styles.retryText}>再試行</Text>
          </Pressable>
        </View>
      ) : comments.length === 0 ? (
        <Text style={styles.stateText}>最初のコメントを投稿しよう</Text>
      ) : (
        <View style={styles.comments}>
          {comments.map((comment) => (
            <View key={comment.id} style={styles.commentRow}>
              <Text style={styles.userName} numberOfLines={1}>
                @{comment.user.name}
              </Text>
              <Text style={styles.body} numberOfLines={1}>
                {comment.body}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,216,255,0.18)",
    backgroundColor: "rgba(0,216,255,0.05)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  containerPressed: {
    opacity: 0.75,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  openLabel: {
    color: "#00D8FF",
    fontSize: 12,
    fontWeight: "700",
  },
  centeredState: {
    minHeight: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  errorRow: {
    minHeight: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  stateText: {
    color: "#6E7594",
    fontSize: 12,
  },
  retryText: {
    color: "#00D8FF",
    fontSize: 12,
    fontWeight: "700",
  },
  comments: {
    gap: 7,
  },
  commentRow: {
    flexDirection: "row",
    gap: 8,
  },
  userName: {
    width: 88,
    color: "#B7BDD6",
    fontSize: 12,
    fontWeight: "700",
  },
  body: {
    flex: 1,
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
  },
});
