/**
 * posted.tsx — DROP完了演出（演出専用・ボタンなし）
 *
 * フロー:
 * 1) 背景暗転（40% overlay）
 * 2) 画面中央でMOVロゴを自動再生（ループなし）
 * 3) playToEnd → ロゴ静止表示を維持
 * 4) ロゴ下に「WELCOME」が浮かび上がる
 *    - 出現: opacity 0→1 / translateY +12→0 / 0.6s easeOut
 *    - 脈動: scale 1→1.04→1 / glow 1→1.3→1 / 0.2s easeInOut
 *    - 維持: 1.5秒
 *    - 消滅: フェードアウト 0.4s
 * 5) フェードアウト完了後、自動でお題一覧（DROPS一覧）へ遷移
 *
 * 操作制御: 演出中はタップ操作を無効化
 */

import { router } from "expo-router";
import React, { useCallback, useEffect, useRef } from "react";
import { Dimensions, Platform, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { VideoView, useVideoPlayer } from "expo-video";
import { useEventListener } from "expo";
import { useAppMode } from "@/lib/app-mode-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const VIDEO_WIDTH = Math.round(SCREEN_WIDTH * 0.60);
const VIDEO_HEIGHT = VIDEO_WIDTH;

const NEON = "#00D8FF";
const COLORS = { bg: "#000000" };
const VIDEO_SOURCE = require("@/assets/images/logo.mov");
const VIDEO_FALLBACK_MS = 3500;

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PostedScreen() {
  const insets = useSafeAreaInsets();
  const { enterCommunity } = useAppMode();
  const navigated = useRef(false);
  const sequenceStarted = useRef(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Animated values ──────────────────────────────────────────────────────
  // WELCOME: opacity + translateY + scale
  const welcomeOpacity = useSharedValue(0);
  const welcomeTranslateY = useSharedValue(12);
  const welcomeScale = useSharedValue(1);
  // Glow intensity (textShadowRadius multiplier via opacity of glow layer)
  const welcomeGlow = useSharedValue(1);

  // ── Navigation guard ─────────────────────────────────────────────────────
  const goToDrops = useCallback(() => {
    if (navigated.current) return;
    navigated.current = true;
    enterCommunity();
    router.replace("/(tabs)/posts" as any);
  }, [enterCommunity]);

  const startWelcomeSequence = useCallback(() => {
    if (sequenceStarted.current) return;
    sequenceStarted.current = true;

    // 1) Slide up + fade in WELCOME (0.6s easeOut)
    welcomeTranslateY.value = withTiming(0, {
      duration: 600,
      easing: Easing.out(Easing.ease),
    });
    welcomeOpacity.value = withTiming(1, {
      duration: 600,
      easing: Easing.out(Easing.ease),
    });

    // 2) Pulse on appear: scale 1 → 1.04 → 1 over 0.2s (starts immediately)
    welcomeScale.value = withSequence(
      withTiming(1.04, { duration: 100, easing: Easing.inOut(Easing.ease) }),
      withTiming(1.0, { duration: 100, easing: Easing.inOut(Easing.ease) })
    );

    // 3) Glow pulse: 1 → 1.3 → 1 over 0.2s
    welcomeGlow.value = withSequence(
      withTiming(1.3, { duration: 100, easing: Easing.inOut(Easing.ease) }),
      withTiming(1.0, { duration: 100, easing: Easing.inOut(Easing.ease) })
    );

    // 4) After 0.6s appear + 1.5s hold = 2.1s, fade out over 0.4s
    holdTimerRef.current = setTimeout(() => {
      welcomeOpacity.value = withTiming(0, {
        duration: 400,
        easing: Easing.in(Easing.ease),
      });
      // 5) After fade out completes (0.4s), navigate to drops
      navigateTimerRef.current = setTimeout(() => {
        goToDrops();
      }, 420);
    }, 2100);
  }, [goToDrops, welcomeGlow, welcomeOpacity, welcomeScale, welcomeTranslateY]);

  // ── Video player ─────────────────────────────────────────────────────────
  const player = useVideoPlayer(
    VIDEO_SOURCE,
    (p) => {
      p.loop = false;
      p.muted = true;
      p.play();
    }
  );

  useEventListener(player, "statusChange", (event) => {
    if (Platform.OS === "web" && event.status === "readyToPlay") {
      // On web, the setup-time play() can run before the underlying video element
      // is ready, so retry once the browser reports that playback can start.
      player.play();
    }
  });

  // playToEnd → trigger WELCOME animation sequence → auto navigate
  useEventListener(player, "playToEnd", () => {
    startWelcomeSequence();
  });

  useEffect(() => {
    // Keep the check-in flow moving even if the video end event is not delivered.
    const fallbackTimer = setTimeout(() => {
      startWelcomeSequence();
    }, VIDEO_FALLBACK_MS);

    return () => {
      clearTimeout(fallbackTimer);
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (navigateTimerRef.current) clearTimeout(navigateTimerRef.current);
    };
  }, [startWelcomeSequence]);

  // ── Animated styles ───────────────────────────────────────────────────────
  const welcomeStyle = useAnimatedStyle(() => ({
    opacity: welcomeOpacity.value,
    transform: [
      { translateY: welcomeTranslateY.value },
      { scale: welcomeScale.value },
    ],
    // Glow intensity driven by welcomeGlow
    textShadowRadius: 10 * welcomeGlow.value,
  }));

  return (
    // pointerEvents="none" disables all touch during the animation
    <View style={[styles.screen, { paddingTop: insets.top }]} pointerEvents="none">
      {/* Dark overlay */}
      <View style={styles.overlay} />

      {/* Center content */}
      <View style={styles.center}>
        {/* MOV logo — autoplay, no controls, no loop */}
        <VideoView
          player={player}
          style={styles.video}
          contentFit="contain"
          nativeControls={false}
          allowsFullscreen={false}
          allowsPictureInPicture={false}
        />

        {/* WELCOME — floats up after MOV ends, then fades out */}
        <Animated.Text style={[styles.welcomeText, welcomeStyle]}>
          WELCOME
        </Animated.Text>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.40)",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  video: {
    width: VIDEO_WIDTH,
    height: VIDEO_HEIGHT,
  },
  welcomeText: {
    marginTop: 14,
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "500",
    letterSpacing: 7,
    // Neon glow (radius driven by animation)
    textShadowColor: NEON,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
});
