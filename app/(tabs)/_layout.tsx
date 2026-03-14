import { Tabs } from "expo-router";
import React from "react";
import { Platform, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { useAppMode } from "@/lib/app-mode-context";

// ─── Colors ──────────────────────────────────────────────────────────────────

const COLORS = {
  bg: "#070812",
  neon: "#00D8FF",
  white: "#FFFFFF",
  border: "#1A1F3A",
};

// ─── Custom Tab Bar Icons (outline / no-fill) ─────────────────────────────────

function IconDrops({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* 2×2 grid outline */}
      <Rect x="3" y="3" width="7.5" height="7.5" rx="1.5" stroke={color} strokeWidth={1.5} />
      <Rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" stroke={color} strokeWidth={1.5} />
      <Rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" stroke={color} strokeWidth={1.5} />
      <Rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" stroke={color} strokeWidth={1.5} />
    </Svg>
  );
}

function IconChat({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 4h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H7l-4 4V5a1 1 0 0 1 1-1z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function IconMyDrop({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth={1.5} />
      <Path
        d="M4 20c0-4 3.6-7 8-7s8 3 8 7"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// ─── Custom Tab Bar ───────────────────────────────────────────────────────────

function NeonTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;

  const ICON_SIZE = 22;

  const iconMap: Record<string, (color: string) => React.ReactElement> = {
    posts: (c) => <IconDrops color={c} size={ICON_SIZE} />,
    "chat-list": (c) => <IconChat color={c} size={ICON_SIZE} />,
    "my-post": (c) => <IconMyDrop color={c} size={ICON_SIZE} />,
  };

  const labelMap: Record<string, string> = {
    posts: "DROPS",
    "chat-list": "CHAT",
    "my-post": "MY DROP",
  };

  const visibleRoutes = state.routes.filter(
    (r: any) => ["posts", "chat-list", "my-post"].includes(r.name)
  );

  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: COLORS.bg,
        borderTopWidth: 0.5,
        borderTopColor: COLORS.border,
        paddingTop: 8,
        paddingBottom: bottomPadding,
        height: tabBarHeight,
      }}
    >
      {visibleRoutes.map((route: any) => {
        const isFocused = state.index === state.routes.indexOf(route);
        const color = isFocused ? COLORS.white : `rgba(255,255,255,0.45)`;

        function onPress() {
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        }

        return (
          <View
            key={route.key}
            style={{ flex: 1, alignItems: "center", justifyContent: "flex-start", gap: 4 }}
          >
            {/* Neon underline (active only) */}
            <View
              style={{
                height: 2,
                width: 28,
                borderRadius: 1,
                backgroundColor: isFocused ? COLORS.neon : "transparent",
                shadowColor: COLORS.neon,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: isFocused ? 0.8 : 0,
                shadowRadius: 4,
                marginBottom: 4,
              }}
            />
            <View
              style={{ alignItems: "center", gap: 3 }}
              onTouchEnd={onPress}
            >
              {iconMap[route.name]?.(color)}
              <View>
                <View style={{ height: 16, justifyContent: "center" }}>
                  <View>
                    {/* label rendered as SVG text substitute via RN Text */}
                    <LabelText label={labelMap[route.name] ?? route.name} color={color} />
                  </View>
                </View>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function LabelText({ label, color }: { label: string; color: string }) {
  return (
    <Text
      style={{
        color,
        fontSize: 10,
        fontWeight: "600",
        letterSpacing: 0.5,
        textAlign: "center",
      }}
    >
      {label}
    </Text>
  );
}

// ─── Tab Layout ───────────────────────────────────────────────────────────────

export default function TabLayout() {
  const { isParticipant } = useAppMode();

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={isParticipant ? (props) => <NeonTabBar {...props} /> : () => null}
    >
      {/* Hidden: Lobby */}
      <Tabs.Screen name="index" options={{ tabBarItemStyle: { display: "none" } }} />

      {/* DROPS */}
      <Tabs.Screen name="posts" />

      {/* CHAT */}
      <Tabs.Screen name="chat-list" />

      {/* MY DROP */}
      <Tabs.Screen name="my-post" />

      {/* Hidden: checkout */}
      <Tabs.Screen name="checkout" options={{ tabBarItemStyle: { display: "none" } }} />
    </Tabs>
  );
}
