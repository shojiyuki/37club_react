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
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Polyline } from "react-native-svg";

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

  function handleLogOut() {
    Alert.alert(
      "Log Out",
      "ログアウトしますか？",
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: () => {
            router.replace("/(tabs)/index" as any);
          },
        },
      ],
      { cancelable: true }
    );
  }

  function handleDeleteAccount() {
    Alert.alert(
      "Delete Account",
      "アカウントを削除すると元に戻せません。本当に削除しますか？",
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            // TODO: call delete account API
          },
        },
      ],
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
            onPress={() => {}}
          />
          <View style={styles.divider} />
          <Row
            label="Participation"
            onPress={() => {}}
          />
          <View style={styles.divider} />
          <Row
            label="Membership"
            onPress={() => {}}
          />
          <View style={styles.divider} />
          <Row
            label="Rules & Safety"
            onPress={() => {}}
          />
          <View style={styles.divider} />
          <Row
            label="Support"
            onPress={() => {}}
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
