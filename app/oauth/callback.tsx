import { ThemedView } from "@/components/themed-view";
import { ActivityIndicator, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OAuthCallback() {
  return (
    <SafeAreaView className="flex-1" edges={["top", "bottom", "left", "right"]}>
      <ThemedView className="flex-1 items-center justify-center gap-4 p-5">
        <ActivityIndicator size="large" />
        <Text className="mt-4 text-base leading-6 text-center text-foreground">
          Completing authentication...
        </Text>
      </ThemedView>
    </SafeAreaView>
  );
}
