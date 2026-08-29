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
import { createSafetyOperationController } from "./safety-operation";
import {
  SafetyPresentation,
  type SafetyPresentationMode,
} from "./SafetyPresentation";

export type BlockConfirmDialogContentProps = {
  mode: "block" | "unblock";
  isSubmitting: boolean;
  error: Error | null;
  onConfirm: () => void;
  onClose: () => void;
};

export type BlockConfirmDialogProps = {
  visible: boolean;
  sessionKey?: string;
  mode: "block" | "unblock";
  onConfirm: () => Promise<unknown> | unknown;
  onSuccess?: () => void;
  onClose: () => void;
  presentation?: SafetyPresentationMode;
};

export type BlockDialogOperationSessionParams = Pick<
  BlockConfirmDialogProps,
  "mode" | "sessionKey" | "visible"
>;

export type BlockDialogResetParams = {
  previousVisible: boolean;
  visible: boolean;
  previousMode: "block" | "unblock";
  mode: "block" | "unblock";
};

const COPY = {
  block: {
    title: "このユーザーをブロックしますか？",
    body: "相互のフォローが解除され、投稿とチャットが表示されなくなります。解除してもフォローは戻りません。",
    confirm: "ブロックする",
  },
  unblock: {
    title: "ブロックを解除しますか？",
    body: "ブロックを解除しても以前のフォローは戻りません。",
    confirm: "解除する",
  },
} as const;

const COLORS = {
  backdrop: "rgba(7,8,18,0.72)",
  panel: "#0E1020",
  surface: "#13162B",
  text: "#FFFFFF",
  muted: "#B7BDD6",
  border: "rgba(255,255,255,0.08)",
  accent: "#00D8FF",
  destructive: "#FF7A7A",
  error: "#FF7A7A",
};

export function shouldResetBlockDialogState({
  previousVisible,
  visible,
  previousMode,
  mode,
}: BlockDialogResetParams) {
  if (previousVisible !== visible) return true;
  return visible && previousMode !== mode;
}

export function getBlockDialogErrorMessage() {
  return "操作を完了できませんでした。時間をおいてもう一度お試しください。";
}

export function getBlockDialogOperationSessionIdentity({
  mode,
  sessionKey = "standalone",
  visible,
}: BlockDialogOperationSessionParams) {
  return JSON.stringify(["block", sessionKey, visible, visible ? mode : null]);
}

export function BlockConfirmDialog({
  visible,
  sessionKey,
  mode,
  onConfirm,
  onSuccess,
  onClose,
  presentation,
}: BlockConfirmDialogProps) {
  const insets = useSafeAreaInsets();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const operationSessionIdentity = getBlockDialogOperationSessionIdentity({
    mode,
    sessionKey,
    visible,
  });
  const operationController = React.useRef(
    createSafetyOperationController(operationSessionIdentity),
  );

  const canClose = !isSubmitting;
  const handleClose = React.useCallback(() => {
    if (canClose) {
      onClose();
    }
  }, [canClose, onClose]);

  React.useLayoutEffect(() => {
    if (
      operationController.current.syncSessionIdentity(operationSessionIdentity)
    ) {
      setError(null);
      setIsSubmitting(operationController.current.isSubmitting());
    }
  }, [operationSessionIdentity]);

  React.useLayoutEffect(
    () => () => {
      operationController.current.advanceSession();
    },
    [],
  );

  async function handleConfirm() {
    if (operationController.current.isSubmitting()) return;
    setError(null);

    await operationController.current.run({
      operation: onConfirm,
      onPendingChange: setIsSubmitting,
      onSuccess: () => {
        setError(null);
        if (onSuccess) {
          onSuccess();
        } else {
          onClose();
        }
      },
      onError: () => {
        setError(new Error(getBlockDialogErrorMessage()));
      },
    });
  }

  return (
    <SafetyPresentation
      presentation={presentation}
      visible={visible}
      onRequestClose={handleClose}
    >
      <View
        style={[
          styles.overlay,
          {
            paddingTop: Math.max(insets.top, 20),
            paddingBottom: Math.max(insets.bottom, 20),
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="ブロック確認を閉じる"
          style={styles.backdrop}
          onPress={handleClose}
        />
        <BlockConfirmDialogContent
          mode={mode}
          isSubmitting={isSubmitting}
          error={error}
          onConfirm={() => {
            void handleConfirm();
          }}
          onClose={handleClose}
        />
      </View>
    </SafetyPresentation>
  );
}

export function BlockConfirmDialogContent({
  mode,
  isSubmitting,
  error,
  onConfirm,
  onClose,
}: BlockConfirmDialogContentProps) {
  const copy = COPY[mode];

  return (
    <View style={styles.contentWrap} pointerEvents="box-none">
      <View style={styles.panel}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.body}>{copy.body}</Text>
          {error ? (
            <Text accessibilityRole="alert" style={styles.errorText}>
              {getBlockDialogErrorMessage()}
            </Text>
          ) : null}
        </ScrollView>
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.confirm}
            disabled={isSubmitting}
            style={({ pressed }) => [
              styles.confirmButton,
              pressed && !isSubmitting && styles.confirmPressed,
              isSubmitting && styles.buttonDisabled,
            ]}
            onPress={onConfirm}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#070812" />
            ) : (
              <Text style={styles.confirmText}>{copy.confirm}</Text>
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="キャンセル"
            disabled={isSubmitting}
            style={({ pressed }) => [
              styles.cancelButton,
              pressed && !isSubmitting && styles.cancelPressed,
              isSubmitting && styles.buttonDisabled,
            ]}
            onPress={onClose}
          >
            <Text style={styles.cancelText}>キャンセル</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.backdrop,
  },
  contentWrap: {
    justifyContent: "center",
  },
  panel: {
    maxHeight: "100%",
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    backgroundColor: COLORS.panel,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    gap: 16,
  },
  scrollContent: {
    gap: 16,
    paddingBottom: 8,
  },
  actions: {
    gap: 12,
  },
  title: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "700",
  },
  body: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 22,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 13,
    lineHeight: 20,
  },
  confirmButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: COLORS.accent,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  confirmPressed: {
    opacity: 0.84,
  },
  confirmText: {
    color: "#070812",
    fontSize: 16,
    fontWeight: "700",
  },
  cancelButton: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  cancelPressed: {
    backgroundColor: "#161B33",
  },
  cancelText: {
    color: COLORS.muted,
    fontSize: 15,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.55,
  },
});
