import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LiveTimerHeaderTicking } from "@/components/LiveTimerHeader";
import { useParticipation } from "@/hooks/use-participation";
import { useStorageUploadTarget } from "@/hooks/use-storage-upload";
import { isMockDataSource } from "@/lib/data-source";
import { loadUploadableImage, uploadImageToUrl } from "@/lib/storage/upload-image";

const COLORS = {
  bg: "#070812",
  neon: "#00D8FF",
  neonGlow: "rgba(0,216,255,0.7)",
  white: "#FFFFFF",
  textSecondary: "#B7BDD6",
  textMuted: "#6E7594",
  inputBg: "#10131A",
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SQUARE_SIZE = SCREEN_WIDTH * 0.84;
const MAX_CHARS = 20;

// Shared pill dimensions
const PILL_WIDTH = SCREEN_WIDTH * 0.77;
const PILL_HEIGHT = 56;
const PILL_RADIUS = 28;

const CHECK_IN_ERROR_MESSAGES: Record<string, string> = {
  ACTIVE_PARTICIPATION_EXISTS: "すでに参加中のトピックがあります。先にCHECK OUTしてください。",
  IMAGE_ALREADY_USED: "この写真はすでに使用されています。撮り直してもう一度お試しください。",
  IMAGE_NOT_FOUND: "写真のアップロード確認に失敗しました。撮り直してもう一度お試しください。",
  INVALID_IMAGE_CONTENT_TYPE: "この写真形式は使用できません。撮り直してもう一度お試しください。",
  IMAGE_TOO_LARGE: "写真のサイズが大きすぎます。撮り直してもう一度お試しください。",
  INVALID_IMAGE_KEY: "写真の保存先を確認できませんでした。撮り直してもう一度お試しください。",
  INVALID_LOCATION: "現在地を正しく取得できませんでした。少し待ってからもう一度お試しください。",
  LOCATION_TOO_INACCURATE: "位置情報の精度が低いためCHECK INできません。少し待ってからもう一度お試しください。",
  OUTSIDE_TOPIC_AREA: "現在地がトピックの範囲外です。開催場所の近くでCHECK INしてください。",
  TOPIC_CLOSED: "このトピックは終了しました。TOPから参加できるトピックを選び直してください。",
  TOPIC_NOT_FOUND: "トピックが見つかりません。TOPから入り直してください。",
  TOPIC_NOT_STARTED: "このトピックはまだ開始していません。開始時間になってからCHECK INしてください。",
  "Location permission was denied": "位置情報の許可が必要です。端末の設定で位置情報を許可してからもう一度お試しください。",
  "Topic ID is missing": "トピック情報を確認できませんでした。TOPから入り直してください。",
  "Image URI is required": "写真を確認できませんでした。撮り直してもう一度お試しください。",
};

function getCheckInErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : null;
  if (message && CHECK_IN_ERROR_MESSAGES[message]) {
    return CHECK_IN_ERROR_MESSAGES[message];
  }
  if (message?.startsWith("Failed to load image")) {
    return "写真を読み込めませんでした。撮り直してもう一度お試しください。";
  }
  if (message?.startsWith("Failed to upload image")) {
    return "写真のアップロードに失敗しました。通信状況を確認してもう一度お試しください。";
  }
  return "CHECK INに失敗しました。もう一度お試しください。";
}

async function getCurrentCheckInLocation() {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== Location.PermissionStatus.GRANTED) {
    throw new Error("Location permission was denied");
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy ?? Number.POSITIVE_INFINITY,
  };
}

export default function PreviewScreen() {
  const insets = useSafeAreaInsets();
  const { checkIn, isCheckingIn } = useParticipation();
  const { createUploadUrl, discardUpload, isCreatingUploadUrl } = useStorageUploadTarget();
  const params = useLocalSearchParams<{
    uri?: string;
    topicId?: string;
    startAt?: string;
    remainingMs?: string;
  }>();

  const uri = params.uri ?? "";
  const topicId = params.topicId ? parseInt(params.topicId, 10) : null;
  const remainingMs = params.remainingMs ? parseInt(params.remainingMs, 10) : 5 * 60 * 1000;
  const startAt = params.startAt ?? new Date(Date.now() - (37 * 60 * 1000 - remainingMs)).toISOString();

  const [caption, setCaption] = useState("");
  const [postError, setPostError] = useState<string | null>(null);
  const isMockMode = isMockDataSource();

  // Breathing glow for CHECK IN button
  const glowOpacity = useSharedValue(0.35);
  const pressGlow = useSharedValue(0);

  useEffect(() => {
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.25, { duration: 1800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: glowOpacity.value + pressGlow.value,
  }));

  function handlePressIn() {
    pressGlow.value = withTiming(0.5, { duration: 80 });
  }
  function handlePressOut() {
    pressGlow.value = withTiming(0, { duration: 300 });
  }

  function handleRetake() {
    router.back();
  }

  async function handlePost() {
    if (isCreatingUploadUrl || isCheckingIn) return;
    setPostError(null);
    let uploadedImageStorageKey: string | null = null;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    try {
      if (!topicId || !Number.isFinite(topicId)) {
        throw new Error("Topic ID is missing");
      }
      if (isMockMode) {
        await checkIn({
          topicId,
          imageStorageKey: `mock/users/me/posts/${Date.now()}.png`,
          caption,
          location: {
            latitude: 35.6595,
            longitude: 139.7005,
            accuracy: 10,
          },
        });
        router.push({
          pathname: "/check-in/posting" as any,
          params: { startAt, remainingMs: String(remainingMs) },
        });
        return;
      }
      const location = await getCurrentCheckInLocation();
      const image = await loadUploadableImage(uri);
      const uploadTarget = await createUploadUrl({
        contentType: image.contentType,
        contentLength: image.contentLength,
      });
      await uploadImageToUrl({
        uploadUrl: uploadTarget.uploadUrl,
        image,
      });
      uploadedImageStorageKey = uploadTarget.imageStorageKey;
      await checkIn({
        topicId,
        imageStorageKey: uploadTarget.imageStorageKey,
        caption,
        location,
      });
      router.push({
        pathname: "/check-in/posting" as any,
        params: { startAt, remainingMs: String(remainingMs) },
      });
    } catch (error) {
      console.error("[check-in preview] failed", error);
      if (uploadedImageStorageKey) {
        try {
          await discardUpload({ imageStorageKey: uploadedImageStorageKey });
        } catch (discardError) {
          console.warn("[check-in preview] discard upload failed", discardError);
        }
      }
      setPostError(getCheckInErrorMessage(error));
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      {/* LIVE Timer */}
      <LiveTimerHeaderTicking startAt={startAt} />

      <View style={styles.body}>
        {/* Square image preview with neon border */}
        <View style={styles.imageGlowWrapper}>
          <View style={styles.imageWrapper}>
            {uri ? (
              <Image
                source={{ uri }}
                style={styles.image}
                contentFit="cover"
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.placeholderText}>📷</Text>
              </View>
            )}
          </View>
        </View>

        {/* Text input — dark layered background */}
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="コメントを入力..."
            placeholderTextColor={COLORS.textMuted}
            value={caption}
            onChangeText={(t) => setCaption(t.slice(0, MAX_CHARS))}
            maxLength={MAX_CHARS}
            returnKeyType="done"
            multiline={false}
          />
          <Text style={styles.charCount}>
            {caption.length}/{MAX_CHARS}
          </Text>
        </View>

        {/* CHECK IN button — outline pill */}
        <View style={styles.checkInContainer}>
          <Animated.View style={[styles.checkInGlow, glowStyle]} />
          <Pressable
            style={({ pressed }) => [
              styles.checkInPill,
              pressed && styles.checkInPillPressed,
            ]}
            onPress={handlePost}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={isCreatingUploadUrl || isCheckingIn}
          >
            <Text style={styles.checkInLabel}>CHECK IN</Text>
          </Pressable>
        </View>

        {postError ? <Text style={styles.errorText}>{postError}</Text> : null}

        {/* RETAKE — small outline button below */}
        <Pressable
          style={({ pressed }) => [styles.retakeButton, pressed && { opacity: 0.5 }]}
          onPress={handleRetake}
        >
          <Text style={styles.retakeText}>RETAKE</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  body: {
    flex: 1,
    alignItems: "center",
    paddingTop: 8,
    gap: 14,
    paddingBottom: 16,
  },
  // Image with neon border
  imageGlowWrapper: {
    // Outer glow
    shadowColor: COLORS.neon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    borderRadius: 12,
  },
  imageWrapper: {
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "rgba(0,216,255,0.4)",
  },
  image: {
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
  },
  imagePlaceholder: {
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0E1020",
  },
  placeholderText: {
    fontSize: 64,
  },
  // Input — dark layered background
  inputWrapper: {
    width: SQUARE_SIZE,
    backgroundColor: COLORS.inputBg,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  input: {
    flex: 1,
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "400",
    lineHeight: 24,
  },
  charCount: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "400",
    marginLeft: 8,
    opacity: 0.6,
  },
  // CHECK IN outline pill
  checkInContainer: {
    width: PILL_WIDTH,
    height: PILL_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  checkInGlow: {
    position: "absolute",
    width: PILL_WIDTH + 24,
    height: PILL_HEIGHT + 24,
    borderRadius: PILL_RADIUS + 12,
    backgroundColor: "transparent",
    shadowColor: COLORS.neon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 0,
  },
  checkInPill: {
    width: PILL_WIDTH,
    height: PILL_HEIGHT,
    borderRadius: PILL_RADIUS,
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: COLORS.neon,
    justifyContent: "center",
    alignItems: "center",
  },
  checkInPillPressed: {
    backgroundColor: "rgba(0,216,255,0.08)",
  },
  checkInLabel: {
    color: COLORS.neon,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  errorText: {
    width: SQUARE_SIZE,
    color: "#FF8AA0",
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
    textAlign: "center",
  },
  // RETAKE — small outline button
  retakeButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  retakeText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
});
