/**
 * My Page — 設定ページ（ロゴタップで開く）
 *
 * 白基調の設定画面。SNS的な数値は表示しない。
 *
 * メニュー構成:
 *   Account >
 *   Notifications >
 *   Participation >
 *   Membership >
 *   Rules & Safety >
 *   Support >
 *   ─────────────
 *   Log Out
 *   Delete Account（赤テキスト）
 */

import { router } from "expo-router";
import React from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Polyline } from "react-native-svg";
import { useAuth } from "@/hooks/use-auth";

// ─── Colors ──────────────────────────────────────────────────────────────────

const C = {
  bg: "#FFFFFF",
  surface: "#F7F8FA",
  text: "#111111",
  sub: "#666666",
  border: "#EAEAEA",
  chevron: "#CCCCCC",
  danger: "#D0021B",
};

// ─── Icons ───────────────────────────────────────────────────────────────────

function ChevronRight() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Polyline
        points="9 18 15 12 9 6"
        stroke={C.chevron}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function BackIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 18l-6-6 6-6"
        stroke={C.text}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─── Row component ────────────────────────────────────────────────────────────

interface RowProps {
  label: string;
  onPress?: () => void;
  danger?: boolean;
  hideChevron?: boolean;
}

function Row({ label, onPress, danger = false, hideChevron = false }: RowProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: "#F0F0F0" }]}
      onPress={onPress}
    >
      <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>
        {label}
      </Text>
      {!hideChevron && !danger && <ChevronRight />}
    </Pressable>
  );
}

// ─── Section ─────────────────────────────────────────────────────────────────

function Section({ children }: { children: React.ReactNode }) {
  return <View style={styles.section}>{children}</View>;
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function MyPageScreen() {
  const insets = useSafeAreaInsets();
  const { logout, loading } = useAuth();

  function showComingSoon(label: string) {
    if (Platform.OS === "web") {
      window.alert(`${label}\nこの項目はまだ準備中です。`);
      return;
    }

    Alert.alert(label, "この項目はまだ準備中です。");
  }

  async function performLogOut() {
    try {
      await logout();
      router.replace("/login" as any);
    } catch {
      Alert.alert("Log Out Failed", "ログアウトに失敗しました。もう一度お試しください。");
    }
  }

  function handleLogOut() {
    if (loading) return;

    if (Platform.OS === "web") {
      if (window.confirm("ログアウトしますか？")) {
        void performLogOut();
      }
      return;
    }

    Alert.alert(
      "Log Out",
      "ログアウトしますか？",
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: () => void performLogOut(),
        },
      ],
      { cancelable: true }
    );
  }

  function handleDeleteAccount() {
    Alert.alert(
      "Delete Account",
      "アカウント削除は仕様確定後に対応します。",
      [{ text: "OK", style: "default" }],
      { cancelable: true }
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.5 }]}
          onPress={() => router.back()}
        >
          <BackIcon />
        </Pressable>
        <Text style={styles.headerTitle}>My Page</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Main settings */}
        <Section>
          <Row
            label="Account"
            onPress={() => router.push("/my-page/account" as any)}
          />
          <View style={styles.divider} />
          <Row
            label="Notifications"
            onPress={() => showComingSoon("Notifications")}
          />
          <View style={styles.divider} />
          <Row
            label="Participation"
            onPress={() => showComingSoon("Participation")}
          />
          <View style={styles.divider} />
          <Row
            label="Membership"
            onPress={() => showComingSoon("Membership")}
          />
          <View style={styles.divider} />
          <Row
            label="Rules & Safety"
            onPress={() => showComingSoon("Rules & Safety")}
          />
          <View style={styles.divider} />
          <Row
            label="Support"
            onPress={() => showComingSoon("Support")}
          />
        </Section>

        {/* Auth actions */}
        <Section>
          <Row
            label="Log Out"
            onPress={handleLogOut}
            hideChevron
          />
          <View style={styles.divider} />
          <Row
            label="Delete Account"
            onPress={handleDeleteAccount}
            danger
            hideChevron
          />
        </Section>
      </ScrollView>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: C.text,
    letterSpacing: 0.2,
  },
  scroll: {
    flex: 1,
    backgroundColor: C.surface,
  },
  section: {
    backgroundColor: C.bg,
    marginTop: 20,
    marginHorizontal: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: C.bg,
  },
  rowLabel: {
    fontSize: 16,
    color: C.text,
    fontWeight: "400",
  },
  rowLabelDanger: {
    color: C.danger,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.border,
    marginLeft: 20,
  },
});
