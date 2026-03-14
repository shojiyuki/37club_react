/**
 * Account settings screen
 * - Username
 * - User ID
 * - Phone Number (masked)
 * - Restricted Accounts >
 */

import { router } from "expo-router";
import React from "react";
import {
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

// ─── Row components ───────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function LinkRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: "#F0F0F0" }]}
      onPress={onPress}
    >
      <Text style={styles.rowLabel}>{label}</Text>
      <ChevronRight />
    </Pressable>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return <View style={styles.section}>{children}</View>;
}

// ─── Screen ──────────────────────────────────────────────────────────────────

// Mock user data
const USER = {
  username: "@me_37club",
  userId: "37C-00142",
  phone: "••• •••• 4521",
};

export default function AccountScreen() {
  const insets = useSafeAreaInsets();

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
        <Text style={styles.headerTitle}>Account</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* User info */}
        <Section>
          <InfoRow label="Username" value={USER.username} />
          <View style={styles.divider} />
          <InfoRow label="User ID" value={USER.userId} />
          <View style={styles.divider} />
          <InfoRow label="Phone Number" value={USER.phone} />
        </Section>

        {/* Restricted Accounts */}
        <Section>
          <LinkRow
            label="Restricted Accounts"
            onPress={() => router.push("/my-page/restricted" as any)}
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
    fontSize: 17,
    fontWeight: "600",
    color: C.text,
  },
  scroll: {
    flex: 1,
    backgroundColor: C.surface,
  },
  section: {
    backgroundColor: C.bg,
    marginTop: 20,
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
  rowValue: {
    fontSize: 15,
    color: "#666666",
    fontWeight: "400",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.border,
    marginLeft: 20,
  },
});
