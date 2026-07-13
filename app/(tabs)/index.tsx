import { useCallback, useEffect, useState } from "react";
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
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { TopicCarousel } from "@/components/TopicCarousel";
import { useAppMode } from "@/lib/app-mode-context";
import { usePinnedTopics } from "@/hooks/use-pinned-topics";
import { useTopics } from "@/hooks/use-topics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const LOGO_WIDTH = Math.round(SCREEN_WIDTH * 0.23); // 23% of screen width

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { isParticipant } = useAppMode();
  const insets = useSafeAreaInsets();

  const { topics, refreshTopics } = useTopics();
  const [refreshing, setRefreshing] = useState(false);

  // ── Pinned state ──────────────────────────────────────────────────────────
  const topicIds = topics.map((t) => t.id);
  const { pinnedIds, toggle: togglePin, isPinned } = usePinnedTopics(topicIds);
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);

  // ── Refresh logic ─────────────────────────────────────────────────────────
  const doRefresh = useCallback(
    (force = false) => {
      refreshTopics(force);
    },
    [refreshTopics]
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
