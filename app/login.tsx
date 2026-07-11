import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { runtimeConfig } from "@/constants/runtime-config";
import { useAuth } from "@/hooks/use-auth";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, loading } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isApiMode = runtimeConfig.dataSource === "api";

  console.log("[login] runtime-config", {
    appEnv: runtimeConfig.appEnv,
    dataSource: runtimeConfig.dataSource,
    apiBaseUrl: runtimeConfig.apiBaseUrl,
    isApiMode,
  });

  useEffect(() => {
    if (!isApiMode) {
      router.replace("/");
    }
  }, [isApiMode]);

  async function handleSignIn() {
    if (!isApiMode) {
      router.replace("/");
      return;
    }

    setErrorMessage(null);
    try {
      await signIn();
      router.replace("/");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Sign in failed");
    }
  }

  if (!isApiMode) {
    return null;
  }

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
      ]}
    >
      <StatusBar style="light" />
      <View style={styles.brand}>
        <Image
          source={require("@/assets/images/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <View style={styles.actions}>
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        <Pressable
          accessibilityRole="button"
          disabled={loading}
          onPress={() => void handleSignIn()}
          style={({ pressed }) => [
            styles.signInButton,
            pressed && !loading && styles.signInButtonPressed,
            loading && styles.signInButtonDisabled,
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#070812" />
          ) : (
            <Text style={styles.signInLabel}>Sign In</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "space-between",
    backgroundColor: "#070812",
    paddingHorizontal: 24,
  },
  brand: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 180,
    height: 180,
  },
  actions: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    gap: 12,
  },
  signInButton: {
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00D8FF",
    borderRadius: 6,
  },
  signInButtonPressed: {
    opacity: 0.78,
  },
  signInButtonDisabled: {
    opacity: 0.6,
  },
  signInLabel: {
    color: "#070812",
    fontSize: 16,
    fontWeight: "700",
  },
  error: {
    color: "#FF8A9A",
    fontSize: 14,
    textAlign: "center",
  },
});
