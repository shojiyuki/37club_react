import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAppMode } from "@/lib/app-mode-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path, Polyline, Line } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LiveTimerHeader } from "@/components/LiveTimerHeader";

const COLORS = {
  bg: "#070812",
  neon: "#00F5FF",
  white: "#FFFFFF",
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SQUARE_SIZE = SCREEN_WIDTH * 0.84;

// ─── Flash Icon (SVG bolt) ────────────────────────────────────────────────────

function FlashIcon({ on }: { on: boolean }) {
  const color = on ? COLORS.neon : COLORS.white;
  const opacity = on ? 1 : 0.7;
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      {/* Bolt shape */}
      <Path
        d="M13 2L4.5 13.5H12L11 22L19.5 10.5H12L13 2Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={opacity}
      />
      {/* Strike-through line when OFF */}
      {!on && (
        <Line
          x1="3"
          y1="3"
          x2="21"
          y2="21"
          stroke={COLORS.white}
          strokeWidth={1.8}
          strokeLinecap="round"
          opacity={0.5}
        />
      )}
    </Svg>
  );
}

// ─── Flip Camera Icon (SVG rotate arrows) ────────────────────────────────────

function FlipIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      {/* Outer arc top-right */}
      <Path
        d="M20 7C18.5 4.5 15.5 3 12 3C7.03 3 3 7.03 3 12"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        opacity={0.9}
      />
      {/* Arrow head top-right */}
      <Polyline
        points="17,4 20,7 17,10"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.9}
      />
      {/* Outer arc bottom-left */}
      <Path
        d="M4 17C5.5 19.5 8.5 21 12 21C16.97 21 21 16.97 21 12"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        opacity={0.9}
      />
      {/* Arrow head bottom-left */}
      <Polyline
        points="7,20 4,17 7,14"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.9}
      />
    </Svg>
  );
}

// ─── Animated Flash Button ────────────────────────────────────────────────────

function FlashButton({ flash, onPress }: { flash: "off" | "on"; onPress: () => void }) {
  const glowOpacity = useSharedValue(0);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  function handlePress() {
    if (flash === "off") {
      // Trigger neon flash animation when turning ON
      glowOpacity.value = withSequence(
        withTiming(1, { duration: 80 }),
        withTiming(0.4, { duration: 70 })
      );
    }
    onPress();
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.5 }]}
      onPress={handlePress}
    >
      {flash === "on" && (
        <Animated.View style={[styles.flashGlow, glowStyle]} />
      )}
      <FlashIcon on={flash === "on"} />
    </Pressable>
  );
}

// ─── Animated Flip Button ─────────────────────────────────────────────────────

function FlipButton({ onPress }: { onPress: () => void }) {
  const rotation = useSharedValue(0);
  const iconColor = useSharedValue(0); // 0 = white, 1 = neon
  const [tapped, setTapped] = useState(false);

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  function handlePress() {
    rotation.value = withTiming(rotation.value + 180, { duration: 200 });
    setTapped(true);
    setTimeout(() => setTapped(false), 300);
    onPress();
  }

  const color = tapped ? COLORS.neon : COLORS.white;

  return (
    <Pressable
      style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.5 }]}
      onPress={handlePress}
    >
      <Animated.View style={rotateStyle}>
        <FlipIcon color={color} />
      </Animated.View>
    </Pressable>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function CameraScreen() {
  const insets = useSafeAreaInsets();
  const { exitCommunity, mode } = useAppMode();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<"back" | "front">("back");
  const [flash, setFlash] = useState<"off" | "on">("off");
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const params = useLocalSearchParams<{
    topicId?: string;
    startAt?: string;
    remainingMs?: string;
    isDemo?: string;
  }>();
  const topicId = params.topicId;
  const remainingMs = params.remainingMs ? parseInt(params.remainingMs, 10) : 5 * 60 * 1000 + 12 * 1000;
  const startAt = params.startAt ?? new Date(Date.now() - (37 * 60 * 1000 - remainingMs)).toISOString();
  const isDemo = params.isDemo === "true";

  // ── Permission handling ──────────────────────────────────────────────────

  if (!permission) {
    return <View style={styles.screen} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.screen, styles.permissionContainer]}>
        <LiveTimerHeader remainingMs={remainingMs} />
        <View style={styles.permissionBody}>
          <Text style={styles.permissionText}>
            カメラへのアクセスを許可してください
          </Text>
          <Pressable
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>許可する</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  async function handleShutter() {
    if (isCapturing || !cameraRef.current) return;
    setIsCapturing(true);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        base64: false,
        skipProcessing: false,
      });
      router.push({
        pathname: "/check-in/preview" as any,
        params: {
          uri: photo?.uri ?? "",
          topicId,
          startAt,
          remainingMs: String(remainingMs),
          isDemo: isDemo ? "true" : "false",
        },
      });
    } catch {
      router.push({
        pathname: "/check-in/preview" as any,
        params: {
          uri: "",
          topicId,
          startAt,
          remainingMs: String(remainingMs),
          isDemo: isDemo ? "true" : "false",
        },
      });
    } finally {
      setIsCapturing(false);
    }
  }

  function handleFlipCamera() {
    setFacing((cur) => (cur === "back" ? "front" : "back"));
  }

  function handleToggleFlash() {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setFlash((cur) => (cur === "off" ? "on" : "off"));
  }

  function handleCancel() {
    // In community mode: show CHECK OUT confirmation
    // In lobby mode: just dismiss (user hasn't posted yet)
    if (mode === "community") {
      Alert.alert(
        "CHECK OUT?",
        "退出すると、このコミュニティは閲覧できなくなります",
        [
          {
            text: "退出する",
            style: "destructive",
            onPress: () => {
              exitCommunity();
              router.dismissAll();
            },
          },
          { text: "キャンセル", style: "cancel" },
        ],
        { cancelable: true }
      );
    } else {
      router.dismissAll();
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* LIVE Timer */}
      <LiveTimerHeader remainingMs={remainingMs} />

      {/* Cancel button */}
      <View style={styles.topBar}>
        <Pressable
          style={({ pressed }) => [styles.cancelButton, pressed && { opacity: 0.6 }]}
          onPress={handleCancel}
        >
          <Text style={styles.cancelText}>✕</Text>
        </Pressable>
      </View>

      {/* Square camera preview */}
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
          flash={flash}
        />
      </View>

      {/* Bottom controls */}
      <View style={styles.bottomControls}>
        {/* Flash toggle */}
        <FlashButton flash={flash} onPress={handleToggleFlash} />

        {/* Shutter */}
        <Pressable
          style={({ pressed }) => [
            styles.shutterOuter,
            pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] },
            isCapturing && { opacity: 0.5 },
          ]}
          onPress={handleShutter}
          disabled={isCapturing}
        >
          <View style={styles.shutterInner} />
        </Pressable>

        {/* Flip camera */}
        <FlipButton onPress={handleFlipCamera} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  permissionContainer: {
    alignItems: "center",
  },
  permissionBody: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
    paddingHorizontal: 32,
  },
  permissionText: {
    color: COLORS.white,
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  permissionButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.neon,
  },
  permissionButtonText: {
    color: COLORS.neon,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.6,
  },
  topBar: {
    height: 44,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  cancelButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelText: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: "300",
  },
  cameraContainer: {
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
    alignSelf: "center",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#111",
  },
  camera: {
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
  },
  bottomControls: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SCREEN_WIDTH * 0.12,
  },
  iconButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  flashGlow: {
    position: "absolute",
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.neon,
    opacity: 0.4,
    // shadowColor not available in StyleSheet for RN — use elevation on Android
  },
  // Shutter: white ring, transparent inside
  shutterOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
});
