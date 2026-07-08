/**
 * lights-out.tsx — 退出演出画面（37分経過・チェックアウト共通）
 *
 * フロー:
 * 1) 背景黒 40% overlay で暗転
 * 2) ロゴMP4を末尾からシークして逆再生（消灯演出・約3秒）
 * 3) 逆再生完了後 0.2秒静止
 * 4) 「LIGHTS OUT」テキストが浮上（opacity 0→1 / translateY +10→0 / 0.4s easeOut）
 * 5) 0.8秒維持
 * 6) フェードアウト 0.3秒
 * 7) お題一覧へ遷移
 *
 * アニメーション中は操作不可（pointerEvents="none" on overlay）
 */

import { useEventListener } from "expo";
import { router } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppMode } from "@/lib/app-mode-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const VIDEO_WIDTH = Math.round(SCREEN_WIDTH * 0.60);
const VIDEO_HEIGHT = VIDEO_WIDTH;

// ─── Constants ────────────────────────────────────────────────────────────────

// Reverse playback: step interval in ms and step size in seconds
// 3-second video, ~50fps equivalent → step every 20ms, jump back 0.02s
const REVERSE_INTERVAL_MS = 20;
const REVERSE_STEP_S = 0.02;

// Slightly blue-tinted white for premium feel
const LIGHTS_OUT_COLOR = "#E8F4FF";

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function LightsOutScreen() {
  const insets = useSafeAreaInsets();
  const { exitCommunity } = useAppMode();
  const navigated = useRef(false);
  const checkoutInFlight = useRef(false);
  const checkoutCompleted = useRef(false);
  const reverseTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [reverseReady, setReverseReady] = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  // ── Animated values ──────────────────────────────────────────────────────
  const lightsOutOpacity = useSharedValue(0);
  const lightsOutTranslateY = useSharedValue(10);
  const screenOpacity = useSharedValue(1);

  // ── Navigation ───────────────────────────────────────────────────────────
  const navigate = useCallback(() => {
    if (navigated.current) return;
    navigated.current = true;
    router.replace("/");
  }, []);

  const runCheckOut = useCallback(async () => {
    if (checkoutInFlight.current || checkoutCompleted.current) return;

    checkoutInFlight.current = true;
    setCheckoutStatus("loading");

    try {
      await exitCommunity();
      checkoutCompleted.current = true;
      setCheckoutStatus("ready");
    } catch {
      setCheckoutStatus("error");
    } finally {
      checkoutInFlight.current = false;
    }
  }, [exitCommunity]);

  useEffect(() => {
    void runCheckOut();
  }, [runCheckOut]);

  // ── Video player ─────────────────────────────────────────────────────────
  const player = useVideoPlayer(
    require("@/assets/images/logo.mov"),
    (p) => {
      p.loop = false;
      p.muted = true;
      // Don't play yet — we'll seek to end first
    }
  );

  // When video is ready (status becomes "readyToPlay"), seek to end and start reverse
  useEventListener(player, "statusChange", ({ status }) => {
    if (status === "readyToPlay" && !reverseReady) {
      setReverseReady(true);
    }
  });

  // Start reverse playback once video is ready
  useEffect(() => {
    if (!reverseReady || checkoutStatus !== "ready") return;

    const duration = player.duration;
    if (!duration || duration <= 0) return;

    // Seek to end
    player.currentTime = duration;

    // Interval to step backwards
    reverseTimerRef.current = setInterval(() => {
      const current = player.currentTime;
      const next = current - REVERSE_STEP_S;

      if (next <= 0) {
        // Reached beginning — stop reverse
        player.currentTime = 0;
        if (reverseTimerRef.current) {
          clearInterval(reverseTimerRef.current);
          reverseTimerRef.current = null;
        }
        // 0.2s static pause, then animate LIGHTS OUT
        const t = setTimeout(() => startLightsOutSequence(), 200);
        return () => clearTimeout(t);
      } else {
        player.currentTime = next;
      }
    }, REVERSE_INTERVAL_MS);

    return () => {
      if (reverseTimerRef.current) {
        clearInterval(reverseTimerRef.current);
        reverseTimerRef.current = null;
      }
    };
  }, [checkoutStatus, reverseReady]);

  // ── LIGHTS OUT animation sequence ────────────────────────────────────────
  function startLightsOutSequence() {
    // Fade + slide up LIGHTS OUT (0.4s easeOut)
    lightsOutOpacity.value = withSequence(
      withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) }),
      // hold 0.8s
      withDelay(800,
        // fade out 0.3s
        withTiming(0, { duration: 300, easing: Easing.in(Easing.ease) })
      )
    );
    lightsOutTranslateY.value = withTiming(0, {
      duration: 400,
      easing: Easing.out(Easing.ease),
    });

    // Screen fade out after full sequence: 0.4 + 0.8 + 0.3 = 1.5s
    screenOpacity.value = withDelay(
      1500,
      withTiming(0, { duration: 300, easing: Easing.in(Easing.ease) })
    );

    // Navigate after screen fades
    const t = setTimeout(navigate, 1800);
    return () => clearTimeout(t);
  }

  // ── Animated styles ───────────────────────────────────────────────────────
  const lightsOutStyle = useAnimatedStyle(() => ({
    opacity: lightsOutOpacity.value,
    transform: [{ translateY: lightsOutTranslateY.value }],
  }));

  const screenStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  return (
    <Animated.View style={[styles.screen, { paddingTop: insets.top }, screenStyle]}>
      {/* Dark overlay */}
      <View style={styles.overlay} pointerEvents="none" />

      {/* Block all touches during animation */}
      {checkoutStatus === "ready" ? (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="box-only" />
      ) : null}

      {/* Center content */}
      <View style={styles.center}>
        {/* Logo video — paused, we control currentTime manually */}
        <VideoView
          player={player}
          style={styles.video}
          contentFit="contain"
          nativeControls={false}
          allowsFullscreen={false}
          allowsPictureInPicture={false}
        />

        {/* LIGHTS OUT — floats up after reverse ends */}
        <Animated.Text style={[styles.lightsOutText, lightsOutStyle]}>
          LIGHTS OUT
        </Animated.Text>
      </View>

      {checkoutStatus !== "ready" ? (
        <View style={styles.checkoutStatus}>
          {checkoutStatus === "loading" ? (
            <ActivityIndicator color="#00D8FF" />
          ) : (
            <>
              <Text style={styles.checkoutError}>チェックアウトできませんでした</Text>
              <Pressable style={styles.retryButton} onPress={() => void runCheckOut()}>
                <Text style={styles.retryButtonText}>再試行</Text>
              </Pressable>
            </>
          )}
        </View>
      ) : null}
    </Animated.View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#000000",
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
  lightsOutText: {
    marginTop: 14,
    color: LIGHTS_OUT_COLOR,
    fontSize: 13,
    fontWeight: "300",
    letterSpacing: 7,
  },
  checkoutStatus: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000000",
  },
  checkoutError: {
    color: "#FFFFFF",
    fontSize: 16,
  },
  retryButton: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#00D8FF",
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: "#00D8FF",
    fontSize: 16,
    fontWeight: "700",
  },
});
