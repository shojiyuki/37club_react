/**
 * MY DROP — 自分の投稿確認 + チェックアウト画面
 *
 * 目的:
 *   - 現在トピックの「自分の投稿」を確認できる
 *   - CHECK OUT ボタンでトピックを退出（LIGHTS OUT 演出画面へ遷移）
 *
 * デザイン: ダークネオン（#070812 背景）
 */

import { router } from "expo-router";
import React from "react";
import {
  Alert,
  Dimensions,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMyPost } from "@/hooks/use-my-post";

// ─── Colors ──────────────────────────────────────────────────────────────────

const C = {
  bg: "#070812",
  surface: "#0E1020",
  neon: "#00D8FF",
  white: "#FFFFFF",
  sub: "rgba(255,255,255,0.45)",
  border: "#1A1F3A",
  borderNeon: "rgba(0,216,255,0.55)",
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const IMAGE_SIZE = SCREEN_WIDTH - 48; // full-width minus padding

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function MyDropScreen() {
  const insets = useSafeAreaInsets();
  const { myPost } = useMyPost();

  function navigateToLightsOut() {
    router.push("/lights-out" as any);
  }

  function handleCheckOut() {
    const message = "トピックを退出しますか？\nチェックアウト後はこのトピックに再参加できません。";

    if (Platform.OS === "web") {
      if (window.confirm(message)) {
        navigateToLightsOut();
      }
      return;
    }

    Alert.alert(
      "Check Out",
      message,
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "Check Out",
          style: "destructive",
          onPress: navigateToLightsOut,
        },
      ],
      { cancelable: true }
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>MY DROP</Text>
        <Text style={styles.headerSub}>{myPost.topicLabel}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Post preview card */}
        <View style={styles.card}>
          {/* Photo */}
          {myPost.imageUri ? (
            <Image
              source={{ uri: myPost.imageUri }}
              style={styles.postImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.postImagePlaceholder}>
              <Text style={styles.placeholderText}>No Photo</Text>
            </View>
          )}

          {/* Caption + time */}
          <View style={styles.captionRow}>
            <Text style={styles.caption} numberOfLines={2}>
              {myPost.caption}
            </Text>
            <Text style={styles.postedAt}>{myPost.postedAt}</Text>
          </View>
        </View>

        {/* Note */}
        <Text style={styles.note}>
          チェックアウト後はこのトピックへの再参加はできません。
        </Text>
      </ScrollView>

      {/* CHECK OUT button — fixed bottom */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, 16) },
        ]}
      >
        <Pressable
          style={({ pressed }) => [
            styles.checkOutBtn,
            pressed && { opacity: 0.75 },
          ]}
          onPress={handleCheckOut}
        >
          <Text style={styles.checkOutLabel}>CHECK OUT</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
    gap: 4,
  },
  headerTitle: {
    color: C.white,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 2,
  },
  headerSub: {
    color: C.sub,
    fontSize: 12,
    fontWeight: "400",
    letterSpacing: 0.3,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    alignItems: "center",
  },
  card: {
    width: IMAGE_SIZE,
    backgroundColor: C.surface,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.borderNeon,
    // Neon glow
    shadowColor: C.neon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  postImage: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
  },
  postImagePlaceholder: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    backgroundColor: "#13162B",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    color: C.sub,
    fontSize: 14,
    fontWeight: "400",
    letterSpacing: 1,
  },
  captionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  caption: {
    flex: 1,
    color: C.white,
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 20,
  },
  postedAt: {
    color: C.sub,
    fontSize: 12,
    fontWeight: "400",
    marginTop: 2,
  },
  note: {
    marginTop: 20,
    color: C.sub,
    fontSize: 12,
    fontWeight: "400",
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: C.bg,
    borderTopWidth: 0.5,
    borderTopColor: C.border,
  },
  checkOutBtn: {
    borderWidth: 1.5,
    borderColor: C.neon,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    // Neon glow
    shadowColor: C.neon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  checkOutLabel: {
    color: C.neon,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 3,
  },
});
