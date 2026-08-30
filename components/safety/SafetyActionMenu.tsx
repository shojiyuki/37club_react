import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  SafetyPresentation,
  type SafetyPresentationMode,
} from "./SafetyPresentation";

export type SafetyActionMenuContentProps = {
  contentReportLabel?: string;
  onReportContent?: () => void;
  onReportUser?: () => void;
  onBlockUser?: () => void;
  onUnfollow?: () => void;
  onClose: () => void;
};

export type SafetyActionMenuProps = SafetyActionMenuContentProps & {
  visible: boolean;
  presentation?: SafetyPresentationMode;
};

type MenuAction = {
  key: string;
  label: string;
  onPress?: () => void;
};

const COLORS = {
  backdrop: "rgba(7,8,18,0.72)",
  panel: "#0E1020",
  border: "rgba(255,255,255,0.08)",
  text: "#FFFFFF",
  muted: "#B7BDD6",
  pressed: "#161B33",
};

export function SafetyActionMenu({
  visible,
  presentation,
  contentReportLabel,
  onReportContent,
  onReportUser,
  onBlockUser,
  onUnfollow,
  onClose,
}: SafetyActionMenuProps) {
  const insets = useSafeAreaInsets();

  return (
    <SafetyPresentation
      presentation={presentation}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="安全メニューを閉じる"
          style={styles.backdrop}
          onPress={onClose}
        />
        <SafetyActionMenuContent
          contentReportLabel={contentReportLabel}
          onReportContent={onReportContent}
          onReportUser={onReportUser}
          onBlockUser={onBlockUser}
          onUnfollow={onUnfollow}
          onClose={onClose}
          bottomInset={insets.bottom}
        />
      </View>
    </SafetyPresentation>
  );
}

export function SafetyActionMenuContent({
  contentReportLabel,
  onReportContent,
  onReportUser,
  onBlockUser,
  onUnfollow,
  onClose,
  bottomInset = 0,
}: SafetyActionMenuContentProps & { bottomInset?: number }) {
  const actions: MenuAction[] = [];

  if (contentReportLabel && onReportContent) {
    actions.push({
      key: "report-content",
      label: contentReportLabel,
      onPress: onReportContent,
    });
  }
  if (onReportUser) {
    actions.push({
      key: "report-user",
      label: "このユーザーを通報",
      onPress: onReportUser,
    });
  }
  if (onBlockUser) {
    actions.push({
      key: "block-user",
      label: "このユーザーをブロック",
      onPress: onBlockUser,
    });
  }
  if (onUnfollow) {
    actions.push({
      key: "unfollow",
      label: "フォロー解除",
      onPress: onUnfollow,
    });
  }

  return (
    <View style={styles.sheetLayer} pointerEvents="box-none">
      <View
        style={[styles.panel, { paddingBottom: Math.max(bottomInset, 12) }]}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          style={styles.scroll}
        >
          {actions.map((action) => (
            <Pressable
              key={action.key}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              style={({ pressed }) => [
                styles.actionButton,
                pressed && styles.actionButtonPressed,
              ]}
              onPress={action.onPress}
            >
              <Text style={styles.actionText}>{action.label}</Text>
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="キャンセル"
            style={({ pressed }) => [
              styles.actionButton,
              styles.cancelButton,
              pressed && styles.actionButtonPressed,
            ]}
            onPress={onClose}
          >
            <Text style={[styles.actionText, styles.cancelText]}>
              キャンセル
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.backdrop,
  },
  sheetLayer: {
    justifyContent: "flex-end",
  },
  panel: {
    maxHeight: "80%",
    backgroundColor: COLORS.panel,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  actionButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.04)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  actionButtonPressed: {
    backgroundColor: COLORS.pressed,
  },
  actionText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  cancelButton: {
    marginTop: 2,
  },
  cancelText: {
    color: COLORS.muted,
  },
});
