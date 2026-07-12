import { Image } from "expo-image";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

const COLORS = {
  surface: "#0E1020",
  surface2: "#13162B",
  neon: "#00D8FF",
  white: "#FFFFFF",
  divider: "rgba(255,255,255,0.08)",
};

type ChatContextHeaderProps = {
  userName: string;
  imageUri?: string;
  caption?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  horizontalPadding?: number;
};

export function ChatContextHeader({
  userName,
  imageUri,
  caption,
  leading,
  trailing,
  horizontalPadding = 16,
}: ChatContextHeaderProps) {
  return (
    <>
      <View style={[styles.contextHeader, { paddingHorizontal: horizontalPadding }]}>
        {leading}
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.postThumb} contentFit="cover" />
        ) : (
          <View style={[styles.postThumb, styles.postThumbFallback]}>
            <Text style={styles.postThumbInitial}>{userName[0]?.toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.contextInfo}>
          <Text style={styles.contextUserName} numberOfLines={1}>
            @{userName}
          </Text>
          {caption ? (
            <Text style={styles.contextCaption} numberOfLines={1}>
              {caption}
            </Text>
          ) : null}
        </View>
        {trailing}
      </View>
      <View style={styles.contextDivider} />
    </>
  );
}

const styles = StyleSheet.create({
  contextHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    gap: 10,
  },
  contextDivider: {
    height: 0.5,
    backgroundColor: COLORS.divider,
  },
  postThumb: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: COLORS.surface2,
  },
  postThumbFallback: {
    justifyContent: "center",
    alignItems: "center",
  },
  postThumbInitial: {
    color: COLORS.neon,
    fontSize: 20,
    fontWeight: "700",
  },
  contextInfo: {
    flex: 1,
    gap: 2,
  },
  contextUserName: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  contextCaption: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    letterSpacing: 0.1,
  },
});
