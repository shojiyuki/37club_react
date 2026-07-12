import { StyleSheet, Text, View } from "react-native";

import type { ChatMessage } from "@/hooks/use-chat-messages";

const COLORS = {
  surface2: "#13162B",
  neonBubble: "rgba(0,216,255,0.12)",
  neonBubbleBorder: "rgba(0,216,255,0.25)",
  white: "#FFFFFF",
  textSecondary: "#B7BDD6",
};

const ME = "me";

export function ChatBubble({
  message,
  compact = false,
}: {
  message: ChatMessage;
  compact?: boolean;
}) {
  const isMe = message.senderId === ME;
  return (
    <View style={[styles.bubbleRow, isMe ? styles.bubbleRowMe : styles.bubbleRowThem]}>
      <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
        <Text
          style={[
            styles.bubbleText,
            compact ? styles.bubbleTextCompact : styles.bubbleTextRegular,
            isMe ? styles.bubbleTextMe : styles.bubbleTextThem,
          ]}
        >
          {message.text}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bubbleRow: {
    flexDirection: "row",
    marginVertical: 2,
  },
  bubbleRowMe: {
    justifyContent: "flex-end",
  },
  bubbleRowThem: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "72%",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 16,
  },
  bubbleMe: {
    backgroundColor: COLORS.neonBubble,
    borderBottomRightRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.neonBubbleBorder,
  },
  bubbleThem: {
    backgroundColor: COLORS.surface2,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 22,
  },
  bubbleTextRegular: {
    fontSize: 15,
    lineHeight: 22,
  },
  bubbleTextCompact: {
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleTextMe: {
    color: COLORS.white,
  },
  bubbleTextThem: {
    color: COLORS.textSecondary,
  },
});
