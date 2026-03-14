import { useCallback, useEffect, useRef, useState } from "react";
import {
  AppState,
  AppStateStatus,
  Dimensions,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { TopicCarousel, type Topic } from "@/components/TopicCarousel";
import { useAppMode } from "@/lib/app-mode-context";
import { usePinnedTopics } from "@/hooks/use-pinned-topics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const LOGO_WIDTH = Math.round(SCREEN_WIDTH * 0.23); // 23% of screen width

// ─── Refresh throttle ────────────────────────────────────────────────────────

const REFRESH_THROTTLE_MS = 15 * 1000; // 15 seconds

// ─── Topic data source ───────────────────────────────────────────────────────
// In production this would be an API call. For now we regenerate timestamps
// to simulate fresh data on each refresh.

function buildTopics(): Topic[] {
  function getLiveStartTime(minutesAgo: number): string {
    return new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();
  }

  return [
    {
      id: "demo",
      startAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      dateLabel: "DEMO — いつでも参加可能",
      location: "ANY LOCATION",
      lat: 35.6895,
      lng: 139.6917,
      items: "自由に撮影してみよう",
      isDemo: true,
    },
    {
      id: "1",
      startAt: getLiveStartTime(31.8),
      dateLabel: "2026/06/12（金）06:00",
      location: "渋谷駅 ハチ公前",
      lat: 35.6595,
      lng: 139.7005,
      items: "赤いもの",
    },
    {
      id: "2",
      startAt: getLiveStartTime(18.2),
      dateLabel: "2026/06/12（金）06:00",
      location: "上野公園 西郷隆盛像前",
      lat: 35.7119,
      lng: 139.771,
      items: "サングラス",
    },
    {
      id: "3",
      startAt: "2026-06-15T06:00:00+09:00",
      dateLabel: "2026/06/15（月）06:00",
      location: "東京タワー 正面入口",
      lat: 35.6586,
      lng: 139.7454,
      items: "白いTシャツ",
    },
    {
      id: "4",
      startAt: "2026-06-18T06:00:00+09:00",
      dateLabel: "2026/06/18（木）06:00",
      location: "鎌倉駅 東口広場",
      lat: 35.3193,
      lng: 139.5503,
      items: "本",
    },
    {
      id: "5",
      startAt: "2026-06-22T06:00:00+09:00",
      dateLabel: "2026/06/22（月）06:00",
      location: "大阪城公園 大手門前",
      lat: 34.6873,
      lng: 135.5262,
      items: "帽子",
    },
  ];
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { isParticipant } = useAppMode();
  const insets = useSafeAreaInsets();

  // ── Topics state ──────────────────────────────────────────────────────────
  const [topics, setTopics] = useState<Topic[]>(() => buildTopics());
  const [refreshing, setRefreshing] = useState(false);
  const lastRefreshAt = useRef<number>(Date.now());

  // ── Pinned state ──────────────────────────────────────────────────────────
  const topicIds = topics.map((t) => t.id);
  const { pinnedIds, toggle: togglePin, isPinned } = usePinnedTopics(topicIds);
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);

  // ── Refresh logic ─────────────────────────────────────────────────────────
  const doRefresh = useCallback(
    (force = false) => {
      const now = Date.now();
      if (!force && now - lastRefreshAt.current < REFRESH_THROTTLE_MS) return;
      lastRefreshAt.current = now;
      setTopics(buildTopics());
    },
    []
  );

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    doRefresh(true); // always refresh on manual pull
    // Small delay so the spinner is visible
    await new Promise((r) => setTimeout(r, 600));
    setRefreshing(false);
  }, [doRefresh]);

  // Auto-refresh on screen focus
  useFocusEffect(
    useCallback(() => {
      doRefresh();
    }, [doRefresh])
  );

  // Auto-refresh on app foreground
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") {
        doRefresh();
      }
    });
    return () => sub.remove();
  }, [doRefresh]);

  // ── Community redirect ────────────────────────────────────────────────────
  useEffect(() => {
    if (isParticipant) {
      router.replace("/(tabs)/posts" as any);
    }
  }, [isParticipant]);

  if (isParticipant) {
    return null;
  }

  // ── Filtered topics for PINNED mode ──────────────────────────────────────
  const displayedTopics = showPinnedOnly
    ? topics.filter((t) => isPinned(t.id))
    : topics;

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor="#00D8FF"
      colors={["#00D8FF"]}
      progressBackgroundColor="#0E1020"
    />
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* PNG logo — top-left, tappable → My Page */}
      <Pressable
        style={({ pressed }) => [
          styles.logoWrapper,
          { top: insets.top + 12, left: 16 },
          pressed && { opacity: 0.65 },
        ]}
        onPress={() => router.push("/my-page" as any)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Image
          source={require("@/assets/images/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </Pressable>

      <TopicCarousel
        topics={displayedTopics}
        allTopicsEmpty={showPinnedOnly && displayedTopics.length === 0}
        pinnedIds={pinnedIds}
        onTogglePin={togglePin}
        showPinnedOnly={showPinnedOnly}
        onTogglePinnedFilter={() => setShowPinnedOnly((v) => !v)}
        refreshControl={refreshControl}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#070812",
  },
  logoWrapper: {
    position: "absolute",
    zIndex: 10,
  },
  logo: {
    width: LOGO_WIDTH,
    height: LOGO_WIDTH,
    opacity: 0.92,
  },
});
