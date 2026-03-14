import { Stack } from "expo-router";

export default function CheckInLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade",
        contentStyle: { backgroundColor: "#070812" },
        // Disable iOS swipe-back gesture so users must use the ✕ button
        // which shows the CHECK OUT confirmation modal
        gestureEnabled: false,
      }}
    >
      <Stack.Screen name="camera" />
      <Stack.Screen name="preview" />
      <Stack.Screen name="posting" />
      <Stack.Screen name="posted" />
    </Stack>
  );
}
