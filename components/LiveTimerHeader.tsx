import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Dimensions, Platform, StyleSheet, Text, View } from "react-native";

const COLORS = {
  neon: "#00D8FF",
  bg: "#070812",
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const LINE_WIDTH = SCREEN_WIDTH * 0.5;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function HorizontalLine() {
  return (
    <View style={styles.lineWrapper}>
      <View style={styles.lineGlow} />
      <View style={styles.line} />
    </View>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface LiveTimerHeaderProps {
  remainingMs: number;
}

export function LiveTimerHeader({ remainingMs }: LiveTimerHeaderProps) {
  return (
    <View style={styles.container}>
      <HorizontalLine />
      <View style={styles.timerGlowWrapper}>
        <Text style={styles.timerText}>{formatCountdown(remainingMs)}</Text>
      </View>
      <HorizontalLine />
    </View>
  );
}

// ─── Self-ticking variant (with auto-expire → LIGHTS OUT) ─────────────────────

interface LiveTimerHeaderTickingProps {
  startAt: string;
  liveDurationMs?: number;
  /** Called when timer reaches 0. Defaults to navigating to /lights-out */
  onExpire?: () => void;
}

export function LiveTimerHeaderTicking({
  startAt,
  liveDurationMs = 37 * 60 * 1000,
  onExpire,
}: LiveTimerHeaderTickingProps) {
  const [remainingMs, setRemainingMs] = useState(() => {
    const elapsed = Date.now() - new Date(startAt).getTime();
    return Math.max(0, liveDurationMs - elapsed);
  });
  const expiredRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - new Date(startAt).getTime();
      const remaining = Math.max(0, liveDurationMs - elapsed);
      setRemainingMs(remaining);

      // Trigger expire once when timer hits 0
      if (remaining === 0 && !expiredRef.current) {
        expiredRef.current = true;
        clearInterval(interval);
        if (onExpire) {
          onExpire();
        } else {
          // Default: navigate to LIGHTS OUT screen
          router.replace("/lights-out" as any);
        }
      }
    }, 500);
    return () => clearInterval(interval);
  }, [startAt, liveDurationMs, onExpire]);

  return <LiveTimerHeader remainingMs={remainingMs} />;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    paddingTop: 24,
    paddingBottom: 8,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.bg,
  },
  timerGlowWrapper: {
    shadowColor: COLORS.neon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 4,
  },
  timerText: {
    color: COLORS.neon,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 3,
    fontVariant: ["tabular-nums"],
    fontFamily: Platform.select({
      ios: "Courier New",
      android: "monospace",
      default: "monospace",
    }),
  },
  lineWrapper: {
    width: LINE_WIDTH,
    alignItems: "center",
    justifyContent: "center",
  },
  lineGlow: {
    position: "absolute",
    width: LINE_WIDTH,
    height: 6,
    backgroundColor: "transparent",
    shadowColor: COLORS.neon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 2,
  },
  line: {
    width: LINE_WIDTH,
    height: 1,
    backgroundColor: COLORS.neon,
    opacity: 0.3,
  },
});
