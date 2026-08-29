/**
 * Restricted Accounts screen
 * - Lists users blocked by the current user
 * - Confirms before unblocking
 */

import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import { BlockConfirmDialog } from "../../components/safety";
import { useBlockActions, useBlockedUsers } from "../../hooks/use-blocks";
import type { AppBlockedUser } from "../../lib/data/types";

// ─── Colors ──────────────────────────────────────────────────────────────────

const C = {
  bg: "#FFFFFF",
  surface: "#F7F8FA",
  text: "#111111",
  sub: "#666666",
  border: "#EAEAEA",
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

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function RestrictedAccountsScreen() {
  const insets = useSafeAreaInsets();
  const { blockedUsers, refreshBlockedUsers, isLoading, error } =
    useBlockedUsers();
  const { unblockUser } = useBlockActions();
  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(
    null,
  );

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

      <RestrictedAccountsContent
        blockedUsers={blockedUsers}
        isLoading={isLoading}
        error={error}
        onRetry={() => {
          void refreshBlockedUsers();
        }}
        onUnblock={setSelectedUserId}
      />

      <BlockConfirmDialog
        visible={selectedUserId !== null}
        sessionKey={`restricted:${selectedUserId ?? "none"}`}
        mode="unblock"
        onConfirm={() =>
          selectedUserId
            ? unblockUser({ targetUserId: selectedUserId })
            : Promise.resolve()
        }
        onSuccess={() => setSelectedUserId(null)}
        onClose={() => setSelectedUserId(null)}
      />
    </View>
  );
}

type RestrictedAccountsContentProps = {
  blockedUsers: AppBlockedUser[];
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  onUnblock: (userId: string) => void;
};

export function RestrictedAccountsContent({
  blockedUsers,
  isLoading,
  error,
  onRetry,
  onUnblock,
}: RestrictedAccountsContentProps) {
  if (isLoading) {
    return (
      <View style={styles.stateContainer}>
        <ActivityIndicator color={C.text} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.stateContainer}>
        <Text style={styles.emptyText}>
          Failed to load restricted accounts.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="制限中アカウントを再読み込み"
          style={({ pressed }) => [
            styles.retryButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={onRetry}
        >
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (blockedUsers.length === 0) {
    return (
      <View style={styles.stateContainer}>
        <Text style={styles.emptyText}>No restricted accounts.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.listContent}>
      {blockedUsers.map((user) => (
        <View key={user.userId} style={styles.userRow}>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{`@${user.name}`}</Text>
            <Text style={styles.blockedAt}>
              {`Blocked ${user.blockedAt.slice(0, 10)}`}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${user.name}のブロックを解除`}
            style={({ pressed }) => [
              styles.unblockButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => onUnblock(user.userId)}
          >
            <Text style={styles.unblockText}>Unblock</Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
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
  stateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    gap: 16,
  },
  emptyText: {
    fontSize: 15,
    color: C.sub,
    fontWeight: "400",
    textAlign: "center",
  },
  retryButton: {
    minWidth: 112,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: C.text,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  retryText: {
    color: C.bg,
    fontSize: 14,
    fontWeight: "600",
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  userRow: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    backgroundColor: C.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userInfo: {
    flex: 1,
    gap: 4,
  },
  userName: {
    color: C.text,
    fontSize: 16,
    fontWeight: "600",
  },
  blockedAt: {
    color: C.sub,
    fontSize: 13,
  },
  unblockButton: {
    minWidth: 88,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.text,
    paddingHorizontal: 14,
  },
  unblockText: {
    color: C.text,
    fontSize: 14,
    fontWeight: "600",
  },
  buttonPressed: {
    opacity: 0.6,
  },
});
