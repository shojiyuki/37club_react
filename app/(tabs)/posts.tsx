import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LiveTimerHeaderTicking } from "@/components/LiveTimerHeader";
import { createPostSafetyTarget } from "@/components/post-safety/post-safety";
import { usePostSafetyFlow } from "@/components/post-safety/usePostSafetyFlow";
import { useBlockActions } from "@/hooks/use-blocks";
import { useFollow } from "@/hooks/use-follow";
import { usePosts } from "@/hooks/use-posts";
import { useReport } from "@/hooks/use-report";
import { useAppMode } from "@/lib/app-mode-context";
import type { AppFollowState, AppPost } from "@/lib/data/types";

// ─── Constants ───────────────────────────────────────────────────────────────

const COLORS = {
  bg: "#070812",
  surface: "#0E1020",
  surface2: "#13162B",
  // ── Neon blue only ──
  neon: "#00D8FF",
  // ── Unpowered (non-follow) frame ──
  unpowered: "#E6E8EE",
  // ── Text ──
  white: "#FFFFFF",
  textSecondary: "#B7BDD6",
  textMuted: "#6E7594",
  border: "#1A1F3A",
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const OUTER_MARGIN = 16;
const CELL_GAP = 7;
const NUM_COLS = 2;
const CELL_SIZE =
  (SCREEN_WIDTH - OUTER_MARGIN * 2 - CELL_GAP * (NUM_COLS - 1)) / NUM_COLS;
const COMMENT_HEIGHT = 22;

const SHEET_70 = SCREEN_HEIGHT * 0.7;
const LIVE_REMAINING_MS = 4 * 60 * 1000 + 52 * 1000;
// Start time for ticking timer (mock: 37min - LIVE_REMAINING_MS ago)
const MOCK_START_AT = new Date(
  Date.now() - (37 * 60 * 1000 - LIVE_REMAINING_MS),
).toISOString();

// ─── Follow button ────────────────────────────────────────────────────────────

function FollowButton({
  state,
  onPress,
}: {
  state: AppFollowState;
  onPress: () => void;
}) {
  if (state === "none") {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.followBtn,
          styles.followBtnNone,
          pressed && { opacity: 0.7 },
        ]}
        onPress={onPress}
      >
        <Text style={[styles.followBtnText, { color: COLORS.neon }]}>
          Follow
        </Text>
      </Pressable>
    );
  }
  if (state === "following") {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.followBtn,
          styles.followBtnFollowing,
          pressed && { opacity: 0.7 },
        ]}
        onPress={onPress}
      >
        <Text
          style={[styles.followBtnText, { color: COLORS.white, opacity: 0.7 }]}
        >
          Following
        </Text>
      </Pressable>
    );
  }
  // mutual → Chat button
  return (
    <Pressable
      style={({ pressed }) => [
        styles.followBtn,
        styles.followBtnMutual,
        pressed && { opacity: 0.85 },
      ]}
      onPress={onPress}
    >
      <Text style={[styles.followBtnText, { color: COLORS.bg }]}>Chat</Text>
    </Pressable>
  );
}

// ─── Bottom Sheet ─────────────────────────────────────────────────────────────

interface BottomSheetProps {
  post: AppPost | null;
  visible: boolean;
  onClose: () => void;
  onFollowChange: (
    userId: string,
    next: AppFollowState,
  ) => void | Promise<void>;
}

function PostBottomSheet({
  post,
  visible,
  onClose,
  onFollowChange,
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(SHEET_70);
  const { report } = useReport();
  const { blockUser } = useBlockActions();
  const postId = post?.id;
  const isMutual = post?.user.followState === "mutual";
  const isMine = post?.user.isMine === true;
  const handleReportSuccess = React.useCallback(() => {
    Alert.alert("通報を受け付けました");
  }, []);
  const postSafety = usePostSafetyFlow({
    visible,
    postId,
    isMutualPost: isMutual,
    report,
    blockUser,
    onUnfollow: handleUnfollowFromMenu,
    onReportSuccess: handleReportSuccess,
    onClose,
  });
  React.useEffect(() => {
    if (visible && postId) {
      translateY.value = withTiming(0, {
        duration: 350,
        easing: Easing.out(Easing.cubic),
      });
    } else if (!visible) {
      translateY.value = withTiming(SHEET_70, { duration: 300 });
    }
  }, [postId, translateY, visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    height: SHEET_70,
  }));

  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .onEnd((e) => {
      if (e.translationY > 80) {
        onClose();
      }
    });

  function handleFollowPress() {
    if (!post) return;
    if (post.user.isMine) return;
    const { followState, id } = post.user;
    if (followState === "mutual") {
      onClose();
      router.push({
        pathname: "/chat/[userId]",
        params: {
          userId: post.user.id,
          userName: post.user.name,
          imageUri: post.imageUri,
          postId: post.id,
        },
      });
      return;
    }
    const next: AppFollowState = followState === "none" ? "following" : "none";
    onFollowChange(id, next);
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function handleMorePress() {
    if (!post || post.user.isMine) return;
    postSafety.openMenu(
      createPostSafetyTarget({
        targetId: post.id,
        userId: post.user.id,
      }),
    );
  }

  function handleUnfollowFromMenu() {
    if (!post) return;
    onFollowChange(post.user.id, "none");
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  const imageSize = SCREEN_WIDTH * 0.88;

  if (!post) {
    return (
      <Modal
        transparent
        visible={visible}
        animationType="none"
        onRequestClose={onClose}
      >
        <View style={StyleSheet.absoluteFillObject} />
      </Modal>
    );
  }

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={postSafety.requestClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.sheet, sheetStyle]}>
          <View style={styles.handleBar} />

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.detailContent,
              { paddingBottom: Math.max(insets.bottom, 24) },
            ]}
          >
            <Image
              source={{ uri: post.imageUri }}
              style={{
                width: imageSize,
                height: imageSize,
                borderRadius: 12,
              }}
              contentFit="cover"
            />
            <View style={[styles.userRow, { width: imageSize }]}>
              <Text style={styles.sheetUserName} numberOfLines={1}>
                @{post.user.name}
              </Text>
              <View style={styles.userRowActions}>
                {!post.user.isMine && (
                  <FollowButton
                    state={post.user.followState}
                    onPress={handleFollowPress}
                  />
                )}
                {!isMine ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${post.user.name}の投稿メニュー`}
                    style={({ pressed }) => [
                      styles.moreBtn,
                      pressed && { opacity: 0.6 },
                    ]}
                    onPress={handleMorePress}
                  >
                    <Text style={styles.moreBtnText}>⋯</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
            <View style={[styles.divider, { width: imageSize }]} />
            {post.caption ? (
              <View style={[styles.captionBox, { width: imageSize }]}>
                <Text style={styles.captionText}>{post.caption}</Text>
              </View>
            ) : null}
          </ScrollView>
        </Animated.View>
      </GestureDetector>

      {postSafety.inlineStage}
    </Modal>
  );
}

// ─── Grid Cell ───────────────────────────────────────────────────────────────

function PostCell({
  item,
  index,
  followState,
  onPress,
}: {
  item: AppPost;
  index: number;
  followState: AppFollowState;
  onPress: () => void;
}) {
  const col = index % NUM_COLS;
  const marginLeft = col === 0 ? 0 : CELL_GAP;

  // "Powered" = following/mutual → neon blue glow
  // "Unpowered" = none → light grey, almost no glow
  const isPowered = followState === "following" || followState === "mutual";
  const borderColor = isPowered ? COLORS.neon : COLORS.unpowered;
  const glowOpacity = isPowered ? 0.35 : 0.1;
  const glowRadius = isPowered ? 12 : 8;
  const glowColor = isPowered ? COLORS.neon : COLORS.unpowered;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.cell,
        { marginLeft, opacity: pressed ? 0.75 : 1 },
      ]}
      onPress={onPress}
    >
      {/* Outer glow */}
      <View
        style={[
          styles.cellGlowWrapper,
          {
            shadowColor: glowColor,
            shadowOpacity: glowOpacity,
            shadowRadius: glowRadius,
          },
        ]}
      >
        <View
          style={[styles.cellImageWrapper, { borderColor, borderWidth: 2 }]}
        >
          <Image
            source={{ uri: item.imageUri }}
            style={styles.cellImage}
            contentFit="cover"
          />

          {/* Bottom gradient overlay */}
          <View style={styles.cellGradientOverlay} pointerEvents="none">
            <Svg
              width={CELL_SIZE}
              height={CELL_SIZE * 0.35}
              style={StyleSheet.absoluteFillObject}
            >
              <Defs>
                <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#070812" stopOpacity="0" />
                  <Stop offset="1" stopColor="#070812" stopOpacity="0.6" />
                </LinearGradient>
              </Defs>
              <Rect
                x="0"
                y="0"
                width={CELL_SIZE}
                height={CELL_SIZE * 0.35}
                fill="url(#grad)"
              />
            </Svg>
          </View>

          {/* Username overlay (bottom-left) */}
          <View style={styles.cellUsernameWrapper} pointerEvents="none">
            <Text style={styles.cellUsername} numberOfLines={1}>
              @{item.user.name}
            </Text>
            {/* Blue 1px line for following/mutual, no line for none */}
            {isPowered && <View style={styles.cellUsernameLine} />}
          </View>
        </View>
      </View>

      {/* Comment below image */}
      <View style={styles.cellComment}>
        <Text style={styles.cellCommentText} numberOfLines={1}>
          {item.caption}
        </Text>
      </View>
    </Pressable>
  );
}

// ─── Animated Tab Underline ───────────────────────────────────────────────────

type TabKey = "all" | "following";
const TAB_KEYS: TabKey[] = ["all", "following"];
const TAB_LABELS: Record<TabKey, string> = {
  all: "ALL",
  following: "FOLLOWING",
};

function TabBar({
  activeTab,
  onSwitch,
  isReloading,
  onReload,
  reloadIconStyle,
}: {
  activeTab: TabKey;
  onSwitch: (tab: TabKey) => void;
  isReloading: boolean;
  onReload: () => void;
  reloadIconStyle: any;
}) {
  // Measure tab widths for underline position
  const [tabWidths, setTabWidths] = useState<number[]>([0, 0]);
  const [tabOffsets, setTabOffsets] = useState<number[]>([0, 0]);
  const underlineX = useSharedValue(0);
  const underlineW = useSharedValue(0);
  const glowOpacity = useSharedValue(1);
  const activeTabIndex = TAB_KEYS.indexOf(activeTab);
  const activeTabWidth = tabWidths[activeTabIndex] ?? 0;
  const activeTabOffset = tabOffsets[activeTabIndex] ?? 0;

  React.useEffect(() => {
    if (activeTabWidth === 0) return;
    underlineX.value = withTiming(activeTabOffset + (activeTabWidth - 28) / 2, {
      duration: 150,
      easing: Easing.out(Easing.quad),
    });
    underlineW.value = withTiming(28, { duration: 150 });
    glowOpacity.value = 0;
    glowOpacity.value = withTiming(1, { duration: 200 });
  }, [
    activeTabIndex,
    activeTabOffset,
    activeTabWidth,
    glowOpacity,
    underlineW,
    underlineX,
  ]);

  const underlineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: underlineX.value }],
    width: underlineW.value,
    opacity: glowOpacity.value,
  }));

  return (
    <View style={styles.tabBar}>
      <View style={styles.tabBarLeft}>
        {TAB_KEYS.map((tab, idx) => {
          const active = activeTab === tab;
          return (
            <Pressable
              key={tab}
              style={styles.tabItem}
              onPress={() => onSwitch(tab)}
              onLayout={(e) => {
                const { width, x } = e.nativeEvent.layout;
                setTabWidths((prev) => {
                  const next = [...prev];
                  next[idx] = width;
                  return next;
                });
                setTabOffsets((prev) => {
                  const next = [...prev];
                  next[idx] = x;
                  return next;
                });
              }}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {TAB_LABELS[tab]}
              </Text>
            </Pressable>
          );
        })}

        {/* Animated underline (positioned absolutely under the tab bar left area) */}
        <Animated.View style={[styles.tabUnderlineAnimated, underlineStyle]} />
      </View>

      {/* Reload button */}
      <Pressable
        style={({ pressed }) => [styles.reloadBtn, pressed && { opacity: 0.6 }]}
        onPress={onReload}
      >
        <Animated.View style={reloadIconStyle}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Path
              d="M20 12a8 8 0 0 1-8 8 8 8 0 0 1-8-8 8 8 0 0 1 8-8c2.4 0 4.6 1.05 6.1 2.72"
              stroke={isReloading ? COLORS.neon : COLORS.textMuted}
              strokeWidth={2}
              strokeLinecap="round"
            />
            <Path
              d="M20 4v4.5h-4.5"
              stroke={isReloading ? COLORS.neon : COLORS.textMuted}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Animated.View>
      </Pressable>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function PostsScreen() {
  const insets = useSafeAreaInsets();
  const { activeTopicStartAt } = useAppMode();
  const { posts, refreshPosts } = usePosts();
  const { followingPosts, getFollowState, updateFollowState } =
    useFollow(posts);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [selectedPost, setSelectedPost] = useState<AppPost | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  const tabScrollRef = useRef<ScrollView>(null);
  const [isReloading, setIsReloading] = useState(false);
  const reloadRotation = useSharedValue(0);

  async function handleReload() {
    if (isReloading) return;
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsReloading(true);
    reloadRotation.value = 0;
    reloadRotation.value = withTiming(360, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });
    try {
      const result = await refreshPosts();
      if (result.isError) throw result.error;
    } catch (error) {
      console.error("[posts] refresh failed", error);
      Alert.alert("更新できませんでした", "時間をおいてもう一度お試しください");
    } finally {
      setIsReloading(false);
    }
  }

  const reloadIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${reloadRotation.value}deg` }],
  }));

  function switchTab(tab: TabKey) {
    setActiveTab(tab);
    tabScrollRef.current?.scrollTo({
      x: tab === "all" ? 0 : SCREEN_WIDTH,
      animated: true,
    });
  }

  function handleTabScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const x = e.nativeEvent.contentOffset.x;
    const newTab: TabKey = x > SCREEN_WIDTH / 2 ? "following" : "all";
    if (newTab !== activeTab) setActiveTab(newTab);
  }

  const handlePostPress = useCallback(
    (post: AppPost) => {
      if (Platform.OS !== "web")
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const merged: AppPost = {
        ...post,
        user: { ...post.user, followState: getFollowState(post) },
      };
      setSelectedPost(merged);
      setSheetVisible(true);
    },
    [getFollowState],
  );

  async function handleFollowChange(userId: string, next: AppFollowState) {
    const previousState =
      selectedPost?.user.id === userId
        ? selectedPost.user.followState
        : undefined;
    setSelectedPost((prev) =>
      prev && prev.user.id === userId
        ? { ...prev, user: { ...prev.user, followState: next } }
        : prev,
    );
    try {
      const resolvedState = await updateFollowState(userId, next);
      setSelectedPost((prev) =>
        prev && prev.user.id === userId
          ? { ...prev, user: { ...prev.user, followState: resolvedState } }
          : prev,
      );
    } catch (error) {
      console.error("[posts] follow update failed", error);
      if (previousState) {
        setSelectedPost((prev) =>
          prev && prev.user.id === userId
            ? { ...prev, user: { ...prev.user, followState: previousState } }
            : prev,
        );
      }
    }
  }

  const renderItem = useCallback(
    ({ item, index }: { item: AppPost; index: number }) => (
      <PostCell
        item={item}
        index={index}
        followState={getFollowState(item)}
        onPress={() =>
          handlePostPress({
            ...item,
            user: { ...item.user, followState: getFollowState(item) },
          })
        }
      />
    ),
    [getFollowState, handlePostPress],
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <LiveTimerHeaderTicking startAt={activeTopicStartAt ?? MOCK_START_AT} />

      <TabBar
        activeTab={activeTab}
        onSwitch={switchTab}
        isReloading={isReloading}
        onReload={handleReload}
        reloadIconStyle={reloadIconStyle}
      />

      {/* Swipeable grid pages */}
      <ScrollView
        ref={tabScrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleTabScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
        contentContainerStyle={{ width: SCREEN_WIDTH * 2 }}
      >
        <View style={{ width: SCREEN_WIDTH }}>
          <FlatList
            data={posts}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            numColumns={NUM_COLS}
            contentContainerStyle={styles.gridContent}
            columnWrapperStyle={styles.row}
            refreshControl={
              <RefreshControl
                colors={[COLORS.neon]}
                onRefresh={() => {
                  void handleReload();
                }}
                refreshing={isReloading}
                tintColor={COLORS.neon}
              />
            }
            showsVerticalScrollIndicator={false}
            scrollEnabled
          />
        </View>
        <View style={{ width: SCREEN_WIDTH }}>
          <FlatList
            data={followingPosts}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            numColumns={NUM_COLS}
            contentContainerStyle={styles.gridContent}
            columnWrapperStyle={styles.row}
            refreshControl={
              <RefreshControl
                colors={[COLORS.neon]}
                onRefresh={() => {
                  void handleReload();
                }}
                refreshing={isReloading}
                tintColor={COLORS.neon}
              />
            }
            showsVerticalScrollIndicator={false}
            scrollEnabled
          />
        </View>
      </ScrollView>

      <PostBottomSheet
        post={selectedPost}
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onFollowChange={handleFollowChange}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  // ── Tab bar ──
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: OUTER_MARGIN,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "space-between",
  },
  tabBarLeft: {
    flexDirection: "row",
    gap: 24,
    alignItems: "center",
    position: "relative",
  },
  tabItem: {
    alignItems: "center",
    paddingBottom: 8,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.white,
    opacity: 0.5,
    letterSpacing: 0.6,
  },
  tabTextActive: {
    color: COLORS.white,
    opacity: 1,
  },
  // Animated underline (absolute, slides between tabs)
  tabUnderlineAnimated: {
    position: "absolute",
    bottom: 0,
    height: 2,
    borderRadius: 1,
    backgroundColor: COLORS.neon,
    shadowColor: COLORS.neon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  reloadBtn: {
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.05)",
  },

  // ── Grid ──
  gridContent: {
    flexGrow: 1,
    paddingHorizontal: OUTER_MARGIN,
    paddingBottom: 24,
    paddingTop: 4,
  },
  row: {
    marginBottom: CELL_GAP,
    gap: 0,
  },

  // ── Cell ──
  cell: {
    width: CELL_SIZE,
  },
  cellGlowWrapper: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  cellImageWrapper: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 10,
    overflow: "hidden",
  },
  cellImage: {
    width: "100%",
    height: "100%",
  },
  cellGradientOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: CELL_SIZE * 0.35,
  },
  cellUsernameWrapper: {
    position: "absolute",
    bottom: 6,
    left: 6,
    right: 6,
  },
  cellUsername: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: "500",
    opacity: 0.65,
    lineHeight: 16,
  },
  // Blue 1px line for powered (following/mutual) users
  cellUsernameLine: {
    height: 1,
    width: "40%",
    backgroundColor: COLORS.neon,
    marginTop: 2,
    opacity: 0.7,
  },
  cellComment: {
    height: COMMENT_HEIGHT,
    justifyContent: "center",
    paddingHorizontal: 2,
    paddingTop: 3,
  },
  cellCommentText: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    lineHeight: 16,
  },

  // ── Bottom Sheet ──
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.white,
    opacity: 0.3,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 0,
  },

  // ── 70% Detail ──
  detailContent: {
    alignItems: "center",
    gap: 16,
    paddingTop: 12,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetUserName: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
    marginRight: 12,
  },
  userRowActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  followBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  followBtnNone: {
    borderWidth: 1,
    borderColor: COLORS.neon,
    backgroundColor: "transparent",
  },
  followBtnFollowing: {
    backgroundColor: COLORS.surface2,
  },
  followBtnMutual: {
    backgroundColor: COLORS.neon,
    shadowColor: COLORS.neon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  followBtnText: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  moreBtn: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  moreBtnText: {
    color: COLORS.textMuted,
    fontSize: 18,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  captionBox: {
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  captionText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: "400",
    lineHeight: 22,
  },
});
