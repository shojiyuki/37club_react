import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LiveTimerHeader } from "@/components/LiveTimerHeader";

const COLORS = {
  bg: "#070812",
  neon: "#00F5FF",
};

const RING_SIZE = 72;
const RING_BORDER = 3;

export default function PostingScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ startAt?: string; remainingMs?: string }>();
  const remainingMs = params.remainingMs ? parseInt(params.remainingMs, 10) : 5 * 60 * 1000;

  // Rotation animation
  const rotation = useSharedValue(0);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  useEffect(() => {
    // Start spinning
    rotation.value = withRepeat(
      withTiming(360, { duration: 800, easing: Easing.linear }),
      -1,
      false
    );

    // Navigate to posted after 600ms
    const timer = setTimeout(() => {
      router.replace({
        pathname: "/check-in/posted" as any,
        params: {
          startAt: params.startAt,
          remainingMs: String(remainingMs),
        },
      });
    }, 600);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <LiveTimerHeader remainingMs={remainingMs} />

      <View style={styles.center}>
        {/* Glow behind ring */}
        <View style={styles.glowRing} />
        {/* Spinning neon ring */}
        <Animated.View style={[styles.ring, animStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  glowRing: {
    position: "absolute",
    width: RING_SIZE + 16,
    height: RING_SIZE + 16,
    borderRadius: (RING_SIZE + 16) / 2,
    backgroundColor: "transparent",
    shadowColor: COLORS.neon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 12,
    elevation: 6,
  },
  ring: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: RING_BORDER,
    borderColor: COLORS.neon,
    // Make it look like a spinner by hiding 3/4 of the ring
    borderTopColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftColor: COLORS.neon,
  },
});
