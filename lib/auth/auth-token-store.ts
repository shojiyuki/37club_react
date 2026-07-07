import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { AuthTokenSet } from "./auth-client";

const REFRESH_TOKEN_KEY = "cognito_refresh_token";

let memoryTokenSet: AuthTokenSet | null = null;

export function getMemoryTokenSet(): AuthTokenSet | null {
  return memoryTokenSet;
}

export async function setTokenSet(tokenSet: AuthTokenSet): Promise<void> {
  memoryTokenSet = tokenSet;

  if (Platform.OS !== "web" && tokenSet.refreshToken) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokenSet.refreshToken);
  }
}

export async function getStoredRefreshToken(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function clearTokenSet(): Promise<void> {
  memoryTokenSet = null;

  if (Platform.OS !== "web") {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  }
}
