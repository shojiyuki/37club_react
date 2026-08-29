import React from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  type StyleProp,
  View,
  type ViewStyle,
} from "react-native";

import type { ChatMessage } from "../../hooks/use-chat-messages";
import { ChatBubble } from "./ChatBubble";

const COLORS = {
  textMuted: "#6E7594",
};

type ChatMessageListProps = {
  messages: ChatMessage[];
  compact?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  emptyText?: string;
  onLayout?: () => void;
  onLongPress?: (message: ChatMessage) => void;
};

export const ChatMessageList = React.forwardRef<
  FlatList<ChatMessage>,
  ChatMessageListProps
>(function ChatMessageList(
  {
    messages,
    compact = false,
    contentContainerStyle,
    emptyText,
    onLayout,
    onLongPress,
  },
  ref,
) {
  return (
    <FlatList
      ref={ref}
      data={messages}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <ChatBubble
          message={item}
          compact={compact}
          onLongPress={onLongPress}
        />
      )}
      contentContainerStyle={contentContainerStyle}
      showsVerticalScrollIndicator={false}
      onLayout={onLayout}
      ListEmptyComponent={
        emptyText ? (
          <View style={styles.emptyChat}>
            <Text style={styles.emptyChatText}>{emptyText}</Text>
          </View>
        ) : null
      }
    />
  );
});

const styles = StyleSheet.create({
  emptyChat: {
    paddingTop: 48,
    alignItems: "center",
  },
  emptyChatText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
});
