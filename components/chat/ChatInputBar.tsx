import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

const COLORS = {
  bg: "#070812",
  surface: "#0E1020",
  surface2: "#13162B",
  neon: "#00D8FF",
  white: "#FFFFFF",
  textMuted: "#6E7594",
  border: "#1A1F3A",
};

type ChatInputBarProps = {
  value: string;
  onChangeText: (value: string) => void;
  onSend: () => void;
  bottomInset: number;
  compact?: boolean;
};

export function ChatInputBar({
  value,
  onChangeText,
  onSend,
  bottomInset,
  compact = false,
}: ChatInputBarProps) {
  const disabled = !value.trim();
  return (
    <View style={[styles.inputBar, { paddingBottom: bottomInset }]}>
      <TextInput
        style={styles.textInput}
        placeholder="メッセージを入力..."
        placeholderTextColor={COLORS.textMuted}
        value={value}
        onChangeText={onChangeText}
        returnKeyType="send"
        onSubmitEditing={onSend}
        multiline={false}
      />
      <Pressable
        style={({ pressed }) => [
          styles.sendButton,
          compact ? styles.sendButtonCompact : styles.sendButtonRegular,
          disabled && styles.sendButtonDisabled,
          pressed && { opacity: 0.7 },
        ]}
        onPress={onSend}
        disabled={disabled}
      >
        <Text
          style={[
            styles.sendButtonText,
            compact ? styles.sendButtonTextCompact : styles.sendButtonTextRegular,
          ]}
        >
          ↑
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  textInput: {
    flex: 1,
    height: 40,
    backgroundColor: COLORS.surface2,
    borderRadius: 20,
    paddingHorizontal: 16,
    color: COLORS.white,
    fontSize: 15,
  },
  sendButton: {
    backgroundColor: COLORS.neon,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.neon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  sendButtonRegular: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  sendButtonCompact: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.border,
    shadowOpacity: 0,
  },
  sendButtonText: {
    color: COLORS.bg,
    fontWeight: "700",
  },
  sendButtonTextRegular: {
    fontSize: 18,
    lineHeight: 22,
  },
  sendButtonTextCompact: {
    fontSize: 16,
    lineHeight: 20,
  },
});
