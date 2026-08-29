import React from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { AppReportReason } from "../../lib/data";
import { createSafetyOperationController } from "./safety-operation";
import {
  SafetyPresentation,
  type SafetyPresentationMode,
} from "./SafetyPresentation";

export type ReportFormContentProps = {
  targetLabel: string;
  selectedReason: AppReportReason | null;
  details: string;
  isSubmitting: boolean;
  error: Error | null;
  onSelectReason: (reason: AppReportReason) => void;
  onChangeDetails: (details: string) => void;
  onSubmit: (input: { reason: AppReportReason; details?: string }) => void;
  onClose: () => void;
};

export type ReportSheetProps = {
  visible: boolean;
  sessionKey?: string;
  targetKey: string;
  targetLabel: string;
  onSubmit: (input: {
    reason: AppReportReason;
    details?: string;
  }) => Promise<unknown> | unknown;
  onSuccess?: () => void;
  onClose: () => void;
  presentation?: SafetyPresentationMode;
};

export type ReportSheetOperationSessionParams = Pick<
  ReportSheetProps,
  "sessionKey" | "targetKey" | "visible"
>;

export type ReportSheetResetParams = {
  previousVisible: boolean;
  visible: boolean;
  previousTargetKey: string;
  targetKey: string;
};

const REPORT_REASONS: { value: AppReportReason; label: string }[] = [
  { value: "spam", label: "スパム" },
  { value: "harassment", label: "嫌がらせ" },
  { value: "sexual_content", label: "性的な内容" },
  { value: "violence", label: "暴力的な内容" },
  { value: "personal_information", label: "個人情報" },
  { value: "impersonation", label: "なりすまし" },
  { value: "other", label: "その他" },
];

const COLORS = {
  backdrop: "rgba(7,8,18,0.72)",
  panel: "#0E1020",
  surface: "#13162B",
  selected: "#00D8FF",
  selectedFill: "rgba(0,216,255,0.12)",
  text: "#FFFFFF",
  muted: "#B7BDD6",
  placeholder: "#6E7594",
  border: "rgba(255,255,255,0.08)",
  error: "#FF7A7A",
  pressed: "#161B33",
  buttonDisabled: "rgba(255,255,255,0.12)",
};

export function canDismissSafetyModal(isSubmitting: boolean) {
  return !isSubmitting;
}

export function shouldResetReportSheetState({
  previousVisible,
  visible,
  previousTargetKey,
  targetKey,
}: ReportSheetResetParams) {
  if (previousVisible !== visible) return true;
  return visible && previousTargetKey !== targetKey;
}

export function getReportSheetErrorMessage() {
  return "通報を送信できませんでした。内容を確認して、時間をおいてもう一度お試しください。";
}

export function getReportSheetOperationSessionIdentity({
  sessionKey = "standalone",
  targetKey,
  visible,
}: ReportSheetOperationSessionParams) {
  return JSON.stringify([
    "report",
    sessionKey,
    visible,
    visible ? targetKey : null,
  ]);
}

export function ReportSheet({
  visible,
  sessionKey,
  targetKey,
  targetLabel,
  onSubmit,
  onSuccess,
  onClose,
  presentation,
}: ReportSheetProps) {
  const insets = useSafeAreaInsets();
  const [selectedReason, setSelectedReason] =
    React.useState<AppReportReason | null>(null);
  const [details, setDetails] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const operationSessionIdentity = getReportSheetOperationSessionIdentity({
    sessionKey,
    targetKey,
    visible,
  });
  const operationController = React.useRef(
    createSafetyOperationController(operationSessionIdentity),
  );

  const resetDraft = React.useCallback((nextSubmitting = false) => {
    setSelectedReason(null);
    setDetails("");
    setError(null);
    setIsSubmitting(nextSubmitting);
  }, []);

  const canClose = canDismissSafetyModal(isSubmitting);
  const handleClose = React.useCallback(() => {
    if (canClose) {
      onClose();
    }
  }, [canClose, onClose]);

  React.useLayoutEffect(() => {
    if (
      operationController.current.syncSessionIdentity(operationSessionIdentity)
    ) {
      resetDraft(operationController.current.isSubmitting());
    }
  }, [operationSessionIdentity, resetDraft]);

  React.useLayoutEffect(
    () => () => {
      operationController.current.advanceSession();
    },
    [],
  );

  async function handleSubmit(input: {
    reason: AppReportReason;
    details?: string;
  }) {
    if (operationController.current.isSubmitting()) return;
    setError(null);

    await operationController.current.run({
      operation: () => onSubmit(input),
      onPendingChange: setIsSubmitting,
      onSuccess: () => {
        resetDraft(false);
        if (onSuccess) {
          onSuccess();
        } else {
          onClose();
        }
      },
      onError: () => {
        setError(new Error(getReportSheetErrorMessage()));
      },
    });
  }

  return (
    <SafetyPresentation
      presentation={presentation}
      visible={visible}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${targetLabel}の通報シートを閉じる`}
          style={styles.backdrop}
          onPress={handleClose}
        />
        <KeyboardAvoidingView
          style={styles.keyboardArea}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ReportFormContent
            targetLabel={targetLabel}
            selectedReason={selectedReason}
            details={details}
            isSubmitting={isSubmitting}
            error={error}
            onSelectReason={setSelectedReason}
            onChangeDetails={setDetails}
            onSubmit={(input) => {
              void handleSubmit(input);
            }}
            onClose={handleClose}
            bottomInset={insets.bottom}
          />
        </KeyboardAvoidingView>
      </View>
    </SafetyPresentation>
  );
}

export function ReportFormContent({
  targetLabel,
  selectedReason,
  details,
  isSubmitting,
  error,
  onSelectReason,
  onChangeDetails,
  onSubmit,
  onClose,
  bottomInset = 0,
}: ReportFormContentProps & { bottomInset?: number }) {
  const submitDisabled = selectedReason === null || isSubmitting;

  return (
    <View style={styles.sheetLayer} pointerEvents="box-none">
      <View
        style={[styles.panel, { paddingBottom: Math.max(bottomInset, 12) }]}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerTextBlock}>
              <Text style={styles.title}>{targetLabel}を通報</Text>
              <Text style={styles.subtitle}>
                当てはまる理由を1つ選び、必要なら詳細を追加してください。
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="通報シートを閉じる"
              disabled={isSubmitting}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && !isSubmitting && styles.pressedButton,
              ]}
              onPress={onClose}
            >
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.reasonList}>
            {REPORT_REASONS.map((reason) => {
              const selected = selectedReason === reason.value;
              return (
                <Pressable
                  key={reason.value}
                  accessibilityRole="button"
                  accessibilityLabel={reason.label}
                  disabled={isSubmitting}
                  style={({ pressed }) => [
                    styles.reasonButton,
                    selected && styles.reasonButtonSelected,
                    pressed && !isSubmitting && styles.pressedButton,
                  ]}
                  onPress={() => onSelectReason(reason.value)}
                >
                  <Text
                    style={[
                      styles.reasonText,
                      selected && styles.reasonTextSelected,
                    ]}
                  >
                    {reason.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.detailsSection}>
            <Text style={styles.sectionLabel}>詳細</Text>
            <TextInput
              accessibilityLabel="通報の詳細"
              value={details}
              onChangeText={onChangeDetails}
              editable={!isSubmitting}
              multiline
              maxLength={500}
              placeholder="必要に応じて状況を入力してください"
              placeholderTextColor={COLORS.placeholder}
              style={styles.detailsInput}
              textAlignVertical="top"
            />
            <Text style={styles.counter}>{details.length}/500</Text>
          </View>

          {error ? (
            <Text accessibilityRole="alert" style={styles.errorText}>
              {getReportSheetErrorMessage()}
            </Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="通報を送信"
            disabled={submitDisabled}
            style={({ pressed }) => [
              styles.submitButton,
              submitDisabled && styles.submitButtonDisabled,
              pressed && !submitDisabled && styles.submitButtonPressed,
            ]}
            onPress={() => {
              if (selectedReason === null) return;
              onSubmit({
                reason: selectedReason,
                details: details.length > 0 ? details : undefined,
              });
            }}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#070812" />
            ) : (
              <Text style={styles.submitText}>通報を送信</Text>
            )}
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
  keyboardArea: {
    justifyContent: "flex-end",
  },
  sheetLayer: {
    justifyContent: "flex-end",
  },
  panel: {
    maxHeight: "88%",
    backgroundColor: COLORS.panel,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 18,
    gap: 18,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  headerTextBlock: {
    flex: 1,
    gap: 6,
  },
  title: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "700",
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  closeText: {
    color: COLORS.muted,
    fontSize: 18,
    fontWeight: "700",
  },
  reasonList: {
    gap: 10,
  },
  reasonButton: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  reasonButtonSelected: {
    borderColor: COLORS.selected,
    backgroundColor: COLORS.selectedFill,
  },
  reasonText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "600",
  },
  reasonTextSelected: {
    color: COLORS.selected,
  },
  detailsSection: {
    gap: 8,
  },
  sectionLabel: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "600",
  },
  detailsInput: {
    minHeight: 132,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    color: COLORS.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    lineHeight: 22,
  },
  counter: {
    alignSelf: "flex-end",
    color: COLORS.muted,
    fontSize: 12,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 13,
    lineHeight: 20,
  },
  submitButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: COLORS.selected,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.buttonDisabled,
  },
  submitButtonPressed: {
    opacity: 0.84,
  },
  submitText: {
    color: "#070812",
    fontSize: 16,
    fontWeight: "700",
  },
  pressedButton: {
    backgroundColor: COLORS.pressed,
  },
});
