import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { AuthTokenSet } from "./auth-client";

const REFRESH_TOKEN_KEY = "cognito_refresh_token";
const WEB_TOKEN_SET_KEY = "cognito_token_set";

let memoryTokenSet: AuthTokenSet | null = null;

function canUseWebStorage(): boolean {
  return Platform.OS === "web" && typeof window !== "undefined" && Boolean(window.sessionStorage);
}

function getWebTokenSet(): AuthTokenSet | null {
  if (!canUseWebStorage()) return null;

  const value = window.sessionStorage.getItem(WEB_TOKEN_SET_KEY);
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Partial<AuthTokenSet>;
    if (typeof parsed.accessToken !== "string" || typeof parsed.accessTokenExpiresAt !== "number") {
      return null;
    }
    return {
      accessToken: parsed.accessToken,
      idToken: typeof parsed.idToken === "string" ? parsed.idToken : undefined,
      refreshToken: typeof parsed.refreshToken === "string" ? parsed.refreshToken : undefined,
      accessTokenExpiresAt: parsed.accessTokenExpiresAt,
    };
  } catch {
    window.sessionStorage.removeItem(WEB_TOKEN_SET_KEY);
    return null;
  }
}

export function getMemoryTokenSet(): AuthTokenSet | null {
  if (memoryTokenSet) return memoryTokenSet;

  const webTokenSet = getWebTokenSet();
  if (webTokenSet) {
    memoryTokenSet = webTokenSet;
  }
  return memoryTokenSet;
}

export async function setTokenSet(tokenSet: AuthTokenSet): Promise<void> {
  memoryTokenSet = tokenSet;

  if (canUseWebStorage()) {
    window.sessionStorage.setItem(WEB_TOKEN_SET_KEY, JSON.stringify(tokenSet));
    return;
  }

  if (tokenSet.refreshToken) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokenSet.refreshToken);
  }
}

export async function getStoredRefreshToken(): Promise<string | null> {
  if (Platform.OS === "web") return getWebTokenSet()?.refreshToken ?? null;
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function clearTokenSet(): Promise<void> {
  memoryTokenSet = null;

  if (canUseWebStorage()) {
    window.sessionStorage.removeItem(WEB_TOKEN_SET_KEY);
    return;
  }

  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}
