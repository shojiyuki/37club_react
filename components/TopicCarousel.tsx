import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Linking,
  Platform,
  Pressable,
  RefreshControlProps,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import Svg, { Path, Circle, Line } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Topic {
  id: string;
  /** ISO 8601 or Date-parseable string */
  startAt: string;
  dateLabel: string;
  location: string;
  lat: number;
  lng: number;
  items: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const LIVE_DURATION_MS = 37 * 60 * 1000; // 37 minutes

const COLORS = {
  bg: "#070812",
  card: "#0E1020",
  surface2: "#13162B",
  textPrimary: "#FFFFFF",
  textSecondary: "#B7BDD6",
  textMuted: "#6E7594",
  neon: "#00D8FF",
  neonGlow: "rgba(0,216,255,0.55)",
  borderNormal: "#1A1F3A",
  borderLive: "#00D8FF",
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH * 0.84;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.38;
const CARD_GAP = 16;
const SIDE_PEEK = (SCREEN_WIDTH - CARD_WIDTH) / 2;

// Pill button dimensions (shared by ENTER and CHECK IN)
const PILL_WIDTH = SCREEN_WIDTH * 0.77;
const PILL_HEIGHT = 56;
const PILL_RADIUS = 28;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getLiveState(startAt: string): { isLive: boolean; remainingMs: number } {
  const start = new Date(startAt).getTime();
  const now = Date.now();
  const elapsed = now - start;
  if (elapsed >= 0 && elapsed < LIVE_DURATION_MS) {
    return { isLive: true, remainingMs: LIVE_DURATION_MS - elapsed };
  }
  return { isLive: false, remainingMs: 0 };
}

function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getInitialIndex(topics: Topic[]): number {
  const now = Date.now();
  const liveTopics = topics
    .map((t, i) => ({ i, ...getLiveState(t.startAt) }))
    .filter((x) => x.isLive);

  if (liveTopics.length > 0) {
    return liveTopics.reduce((a, b) => (a.remainingMs < b.remainingMs ? a : b)).i;
  }

  const upcoming = topics
    .map((t, i) => ({ i, diff: new Date(t.startAt).getTime() - now }))
    .filter((x) => x.diff > 0);

  if (upcoming.length > 0) {
    return upcoming.reduce((a, b) => (a.diff < b.diff ? a : b)).i;
  }

  return 0;
}

function openMap(lat: number, lng: number, label: string) {
  const encodedLabel = encodeURIComponent(label);
  if (Platform.OS === "ios") {
    Linking.openURL(`maps://?q=${encodedLabel}&ll=${lat},${lng}`);
  } else if (Platform.OS === "android") {
    Linking.openURL(`geo:${lat},${lng}?q=${lat},${lng}(${encodedLabel})`);
  } else {
    Linking.openURL(`https://maps.google.com/?q=${lat},${lng}`);
  }
}

// ─── Neon Pin Icon (map pin) ──────────────────────────────────────────────────

function NeonPinIcon({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
        fill={COLORS.neon}
        opacity={0.9}
      />
      <Path
        d="M12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"
        fill={COLORS.bg}
      />
    </Svg>
  );
}

// ─── Pushpin Icon (📌 style) ──────────────────────────────────────────────────
// Outline = unpinned, Filled neon = pinned

function PushpinIcon({
  size = 18,
  active,
}: {
  size?: number;
  active: boolean;
}) {
  const color = active ? COLORS.neon : COLORS.textMuted;
  const opacity = active ? 1 : 0.5;
  // Simple thumbtack shape drawn with SVG paths
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Pin head (circle) */}
      <Circle
        cx="12"
        cy="8"
        r="4"
        fill={active ? color : "none"}
        stroke={color}
        strokeWidth={active ? 0 : 1.8}
        opacity={opacity}
      />
      {/* Pin body */}
      <Line
        x1="12"
        y1="12"
        x2="12"
        y2="20"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        opacity={opacity}
      />
      {/* Horizontal bar */}
      <Line
        x1="8"
        y1="12"
        x2="16"
        y2="12"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        opacity={opacity}
      />
    </Svg>
  );
}

// ─── Hexagon Outline Icon ─────────────────────────────────────────────────────
function HexIcon({ size = 16 }: { size?: number }) {
  const r = 9;
  const cx = 12;
  const cy = 12;
  const pts = Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 30);
    return `${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`;
  }).join(' ');
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d={`M ${pts.split(' ').map((p, i) => (i === 0 ? `M ${p}` : `L ${p}`)).join(' ')} Z`
            .replace('M M ', 'M ')}
        stroke={COLORS.neon}
        strokeWidth={1.8}
        strokeLinejoin="round"
        fill="none"
        opacity={0.9}
      />
    </Svg>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface TopicCardProps {
  topic: Topic;
  isLive: boolean;
  pinned: boolean;
  onTogglePin: (id: string) => void;
}

function TopicCard({ topic, isLive, pinned, onTogglePin }: TopicCardProps) {
  // Animated opacity for pin icon color transition
  const pinOpacity = useSharedValue(pinned ? 1 : 0);

  useEffect(() => {
    pinOpacity.value = withTiming(pinned ? 1 : 0, { duration: 150 });
  }, [pinned]);

  return (
    <View style={[styles.cardGlowWrapper, isLive && styles.cardGlowWrapperLive]}>
      <View style={[styles.card, isLive ? styles.cardLive : styles.cardNormal]}>
        {/* 📌 Pin button — top-right */}
        <Pressable
          style={[
            styles.pinButton,
          ]}
          onPress={() => {
            if (Platform.OS !== "web") {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            onTogglePin(topic.id);
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <PushpinIcon size={18} active={pinned} />
        </Pressable>

        {/* Date/Time — Bold, primary */}
        <Text style={styles.cardDateTime}>{topic.dateLabel}</Text>

        {/* Location — tappable */}
        <Pressable
          style={styles.locationRow}
          onPress={() => openMap(topic.lat, topic.lng, topic.location)}
        >
          <NeonPinIcon size={16} />
          <Text style={styles.cardLocation} numberOfLines={1}>
            {topic.location}
          </Text>
        </Pressable>

        {/* Items — hex icon + item name only (no label) */}
        <View style={styles.itemsRow}>
          <HexIcon size={16} />
          <Text style={styles.cardItems}>{topic.items}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Outline Pill Button ──────────────────────────────────────────────────────

function OutlinePillButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const glowOpacity = useSharedValue(0.35);
  const pressGlow = useSharedValue(0);

  // Subtle breathing glow
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

  return (
    <View style={styles.pillContainer}>
      {/* Outer glow layer */}
      <Animated.View style={[styles.pillGlow, glowStyle]} />
      <Pressable
        style={({ pressed }) => [
          styles.pill,
          pressed && styles.pillPressed,
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Text style={styles.pillLabel}>{label}</Text>
      </Pressable>
    </View>
  );
}

// ─── Countdown Timer ─────────────────────────────────────────────────────────

function HorizontalLine() {
  const lineWidth = SCREEN_WIDTH * 0.5;
  return (
    <View style={[styles.lineWrapper, { width: lineWidth }]}>
      <View style={[styles.lineGlow, { width: lineWidth }]} />
      <View style={[styles.line, { width: lineWidth }]} />
    </View>
  );
}

function CountdownTimer({ startAt }: { startAt: string }) {
  const [remainingMs, setRemainingMs] = useState(() => getLiveState(startAt).remainingMs);

  useEffect(() => {
    const interval = setInterval(() => {
      const { remainingMs: ms } = getLiveState(startAt);
      setRemainingMs(ms);
    }, 500);
    return () => clearInterval(interval);
  }, [startAt]);

  return (
    <View style={styles.timerArea}>
      <HorizontalLine />
      <View style={styles.timerGlowWrapper}>
        <Text style={styles.timerText}>{formatCountdown(remainingMs)}</Text>
      </View>
      <HorizontalLine />
    </View>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface TopicCarouselProps {
  topics: Topic[];
  /** True when PINNED filter is active but there are no pinned topics */
  allTopicsEmpty?: boolean;
  /** Set of pinned topic IDs */
  pinnedIds?: Set<string>;
  /** Called when user taps the pin icon on a card */
  onTogglePin?: (id: string) => void;
  /** Whether the PINNED filter is currently active */
  showPinnedOnly?: boolean;
  /** Called when user taps the filter pin icon in the header */
  onTogglePinnedFilter?: () => void;
  /** RefreshControl element for pull-to-refresh */
  refreshControl?: React.ReactElement<RefreshControlProps>;
}

export function TopicCarousel({
  topics,
  allTopicsEmpty = false,
  pinnedIds = new Set(),
  onTogglePin,
  showPinnedOnly = false,
  onTogglePinnedFilter,
  refreshControl,
}: TopicCarouselProps) {
  const insets = useSafeAreaInsets();

  // ── Loop scroll: triplicate data so we can jump to center copy ────────────
  // Only loop when there are multiple topics; single-item lists don't need duplication.
  const canLoop = topics.length > 1;
  const loopedTopics = canLoop ? [...topics, ...topics, ...topics] : topics;
  const COUNT = topics.length;

  const initialRealIndex = getInitialIndex(topics);
  // Start in the middle copy
  const initialLoopIndex = canLoop ? COUNT + initialRealIndex : initialRealIndex;

  const [activeRealIndex, setActiveRealIndex] = useState(initialRealIndex);
  const flatListRef = useRef<FlatList>(null);
  // Track whether we are in a programmatic jump to avoid re-triggering
  const isJumping = useRef(false);
  const loopStateRef = useRef({
    canLoop,
    count: COUNT,
  });

  useEffect(() => {
    loopStateRef.current = {
      canLoop,
      count: COUNT,
    };
  }, [canLoop, COUNT]);

  useEffect(() => {
    if (initialLoopIndex > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: initialLoopIndex, animated: false });
      }, 100);
    }
  }, [initialLoopIndex]);

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const { canLoop: currentCanLoop, count } = loopStateRef.current;
    if (viewableItems.length === 0 || viewableItems[0].index == null || count === 0) {
      return;
    }

    const loopIdx = viewableItems[0].index;
    const realIdx = currentCanLoop ? loopIdx % count : loopIdx;
    setActiveRealIndex(realIdx);

    // Loop: if we've scrolled into the first or last copy, jump to center
    if (currentCanLoop && !isJumping.current) {
      if (loopIdx < count || loopIdx >= count * 2) {
        isJumping.current = true;
        const targetIdx = count + realIdx;
        // Use a tiny delay so the snap animation finishes first
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({ index: targetIdx, animated: false });
          isJumping.current = false;
        }, 50);
      }
    }
  }, []);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const activeTopic = topics[activeRealIndex];
  const { isLive, remainingMs } = getLiveState(activeTopic?.startAt ?? "");

  const handleEnter = () => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    router.push({
      pathname: "/check-in/camera" as any,
      params: {
        topicId: activeTopic.id,
        startAt: activeTopic.startAt,
        remainingMs: String(remainingMs),
      },
    });
  };

  const renderItem = useCallback(
    ({ item, index }: { item: Topic; index: number }) => {
      const { isLive: cardIsLive } = getLiveState(item.startAt);
      return (
        <View style={styles.cardWrapper}>
          <TopicCard
            topic={item}
            isLive={cardIsLive}
            pinned={pinnedIds.has(item.id)}
            onTogglePin={onTogglePin ?? (() => {})}
          />
        </View>
      );
    },
    [pinnedIds, onTogglePin]
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: CARD_WIDTH + CARD_GAP,
      offset: (CARD_WIDTH + CARD_GAP) * index,
      index,
    }),
    []
  );

  // ── PINNED filter icon (top-right of screen) ──────────────────────────────
  const filterPinGlow = useSharedValue(showPinnedOnly ? 0.7 : 0);
  useEffect(() => {
    filterPinGlow.value = withTiming(showPinnedOnly ? 0.7 : 0, { duration: 200 });
  }, [showPinnedOnly]);

  const filterGlowStyle = useAnimatedStyle(() => ({
    shadowOpacity: filterPinGlow.value,
  }));

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>

      {/* 📌 Filter button — top-right corner, 32px below safe area top */}
      {onTogglePinnedFilter && (
        <Pressable
          style={[styles.filterPinButton, { top: 32 }]}
          onPress={() => {
            if (Platform.OS !== "web") {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            onTogglePinnedFilter();
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Animated.View style={[styles.filterPinGlow, filterGlowStyle]} />
          <PushpinIcon size={22} active={showPinnedOnly} />
        </Pressable>
      )}

      {/* Top: countdown timer (only when LIVE) — placed 24px below safe area */}
      <View style={styles.topArea}>
        {isLive && activeTopic && (
          <CountdownTimer startAt={activeTopic.startAt} />
        )}
      </View>

      {/* PINNED empty state */}
      {allTopicsEmpty || topics.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={refreshControl}
        >
          <Text style={styles.emptyText}>
            {allTopicsEmpty ? "No pinned drops." : "No drops."}
          </Text>
        </ScrollView>
      ) : (
        <>
          {/* Carousel */}
          <View style={styles.carouselArea}>
            <FlatList
              ref={flatListRef}
              data={loopedTopics}
              keyExtractor={(_, index) => String(index)}
              renderItem={renderItem}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={CARD_WIDTH + CARD_GAP}
              snapToAlignment="start"
              decelerationRate="fast"
              contentContainerStyle={styles.flatListContent}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
              getItemLayout={getItemLayout}
              initialScrollIndex={initialLoopIndex}
              // Note: horizontal FlatList does not support RefreshControl.
              // Pull-to-refresh is handled via the wrapper ScrollView approach
              // but since this is horizontal, we skip it here and rely on
              // focus/AppState refresh instead.
            />
          </View>

          {/* Bottom: ENTER button (only when LIVE) */}
          <View style={styles.bottomArea}>
            {isLive && activeTopic && (
              <OutlinePillButton label="ENTER" onPress={handleEnter} />
            )}
          </View>
        </>
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  // Filter pin button (top-right)
  filterPinButton: {
    position: "absolute",
    right: 16,
    zIndex: 20,
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  filterPinGlow: {
    position: "absolute",
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "transparent",
    shadowColor: COLORS.neon,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
    elevation: 0,
  },
  topArea: {
    minHeight: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  timerArea: {
    alignItems: "center",
    gap: 6,
    paddingTop: 24,
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
    alignItems: "center",
    justifyContent: "center",
  },
  lineGlow: {
    position: "absolute",
    height: 6,
    backgroundColor: "transparent",
    shadowColor: COLORS.neon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 2,
  },
  line: {
    height: 1,
    backgroundColor: COLORS.neon,
    opacity: 0.3,
  },
  carouselArea: {
    flex: 1,
    justifyContent: "center",
  },
  flatListContent: {
    paddingHorizontal: SIDE_PEEK,
    alignItems: "center",
    gap: CARD_GAP,
  },
  cardWrapper: {
    width: CARD_WIDTH,
  },
  cardGlowWrapper: {
    borderRadius: 20,
  },
  cardGlowWrapperLive: {
    shadowColor: COLORS.borderLive,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 14,
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
  },
  cardNormal: {
    borderColor: COLORS.borderNormal,
    borderWidth: 1,
  },
  cardLive: {
    borderColor: COLORS.borderLive,
    borderWidth: 1.5,
  },
  // Pin button on card
  pinButton: {
    position: "absolute",
    top: 10,
    right: 14,
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5,
  },
  // Date/time — largest, bold
  cardDateTime: {
    color: COLORS.textPrimary,
    fontSize: 19,
    fontWeight: "700",
    lineHeight: 26,
    letterSpacing: 0.2,
  },
  // Location row
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardLocation: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22,
  },
  // Items row
  itemsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardLabel: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: "400",
  },
  cardItems: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 22,
  },
  // Bottom area
  bottomArea: {
    height: 120,
    justifyContent: "center",
    alignItems: "center",
  },
  // Outline pill button
  pillContainer: {
    width: PILL_WIDTH,
    height: PILL_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  pillGlow: {
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
  pill: {
    width: PILL_WIDTH,
    height: PILL_HEIGHT,
    borderRadius: PILL_RADIUS,
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: COLORS.neon,
    justifyContent: "center",
    alignItems: "center",
  },
  pillPressed: {
    borderColor: COLORS.neon,
    backgroundColor: "rgba(0,216,255,0.08)",
  },
  pillLabel: {
    color: COLORS.neon,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  // Empty state (PINNED 0 items)
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 15,
    fontWeight: "500",
    letterSpacing: 0.5,
  },
});
