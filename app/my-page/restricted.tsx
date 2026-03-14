/**
 * Restricted Accounts screen
 * - Lists reported/restricted users
 * - Tap "Unrestrict >" to show confirmation dialog
 * - Empty state: "No restrictions."
 */

import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
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
  accent: "#0099BB",
};

// ─── Icons ───────────────────────────────────────────────────────────────────

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

function ChevronRight() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Polyline
        points="9 18 15 12 9 6"
        stroke={C.accent}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface RestrictedUser {
  id: string;
  username: string;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const INITIAL_RESTRICTED: RestrictedUser[] = [
  { id: "u1", username: "@user_alpha" },
  { id: "u2", username: "@user_beta" },
];

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function RestrictedAccountsScreen() {
  const insets = useSafeAreaInsets();
  const [restricted, setRestricted] = useState<RestrictedUser[]>(INITIAL_RESTRICTED);

  function handleUnrestrict(user: RestrictedUser) {
    Alert.alert(
      "Remove restriction?",
      "This user will be able to interact in future topics.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: "default",
          onPress: () => {
            setRestricted((prev) => prev.filter((u) => u.id !== user.id));
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
        <Text style={styles.headerTitle}>Restricted Accounts</Text>
        <View style={styles.backBtn} />
      </View>

      {restricted.length === 0 ? (
        /* Empty state */
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No restrictions.</Text>
        </View>
      ) : (
        <FlatList
          data={restricted}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
          ItemSeparatorComponent={() => <View style={styles.divider} />}
          ListHeaderComponent={() => <View style={styles.listHeader} />}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.username}>{item.username}</Text>
              <Pressable
                style={({ pressed }) => [styles.unrestrictBtn, pressed && { opacity: 0.5 }]}
                onPress={() => handleUnrestrict(item)}
              >
                <Text style={styles.unrestrictText}>Unrestrict</Text>
                <ChevronRight />
              </Pressable>
            </View>
          )}
        />
      )}
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
  list: {
    flex: 1,
    backgroundColor: C.bg,
  },
  listHeader: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: C.bg,
  },
  username: {
    fontSize: 16,
    color: C.text,
    fontWeight: "400",
  },
  unrestrictBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  unrestrictText: {
    fontSize: 15,
    color: C.accent,
    fontWeight: "400",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.border,
    marginLeft: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 15,
    color: C.sub,
    fontWeight: "400",
  },
});
