// Load environment variables with proper priority (system > .env)
import "./scripts/load-env.js";
import type { ExpoConfig } from "expo/config";

// Bundle ID format: space.manus.<project_name_dots>.<timestamp>
// e.g., "my-app" created at 2024-01-15 10:30:45 -> "space.manus.my.app.t20240115103045"
// Bundle ID can only contain letters, numbers, and dots
// Android requires each dot-separated segment to start with a letter
const rawBundleId = "space.manus.37club.t20260301095201";
const bundleId =
  rawBundleId
    .replace(/[-_]/g, ".") // Replace hyphens/underscores with dots
    .replace(/[^a-zA-Z0-9.]/g, "") // Remove invalid chars
    .replace(/\.+/g, ".") // Collapse consecutive dots
    .replace(/^\.+|\.+$/g, "") // Trim leading/trailing dots
    .toLowerCase()
    .split(".")
    .map((segment) => {
      // Android requires each segment to start with a letter
      // Prefix with 'x' if segment starts with a digit
      return /^[a-zA-Z]/.test(segment) ? segment : "x" + segment;
    })
    .join(".") || "space.manus.app";
type AppEnv = "local" | "development" | "production";
type DataSource = "mock" | "api";

function resolveAppEnv(value: string | undefined): AppEnv {
  if (value === "development" || value === "production") {
    return value;
  }
  return "local";
}

const appEnv = resolveAppEnv(process.env.APP_ENV);
const apiBaseUrlByEnv: Record<AppEnv, string> = {
  local: process.env.API_BASE_URL_LOCAL ?? process.env.API_BASE_URL ?? "http://localhost:3000",
  development: process.env.API_BASE_URL_DEVELOPMENT ?? process.env.API_BASE_URL ?? "http://localhost:3000",
  production: process.env.API_BASE_URL_PRODUCTION ?? process.env.API_BASE_URL ?? "https://api.example.com",
};
const dataSourceByEnv: Record<AppEnv, DataSource> = {
  local: (process.env.DATA_SOURCE_LOCAL as DataSource | undefined) ?? (process.env.DATA_SOURCE as DataSource | undefined) ?? "mock",
  development: (process.env.DATA_SOURCE_DEVELOPMENT as DataSource | undefined) ?? (process.env.DATA_SOURCE as DataSource | undefined) ?? "api",
  production: (process.env.DATA_SOURCE_PRODUCTION as DataSource | undefined) ?? (process.env.DATA_SOURCE as DataSource | undefined) ?? "api",
};

const cognitoScopes = (process.env.COGNITO_SCOPES ?? "openid email")
  .split(/[\s,]+/)
  .filter(Boolean);

const env = {
  // App branding - update these values directly (do not use env vars)
  appName: "37Club",
  appSlug: "37club",
  // S3 URL of the app logo - set this to the URL returned by generate_image when creating custom logo
  // Leave empty to use the default icon from assets/images/icon.png
  logoUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663361652736/6YZszJFNyR2og9uytmtY2B/37club-icon-BVFyYX3p2zer6VNyjjXoad.png",
  scheme: "club37",
  iosBundleId: bundleId,
  androidPackage: bundleId,
  appEnv,
  dataSource: dataSourceByEnv[appEnv] === "api" ? "api" : "mock",
  apiBaseUrl: apiBaseUrlByEnv[appEnv],
  oauthPortalUrl: process.env.EXPO_PUBLIC_OAUTH_PORTAL_URL ?? process.env.VITE_OAUTH_PORTAL_URL ?? "",
  oauthServerUrl: process.env.EXPO_PUBLIC_OAUTH_SERVER_URL ?? process.env.OAUTH_SERVER_URL ?? "",
  appId: process.env.EXPO_PUBLIC_APP_ID ?? process.env.VITE_APP_ID ?? "",
  ownerOpenId: process.env.EXPO_PUBLIC_OWNER_OPEN_ID ?? process.env.OWNER_OPEN_ID ?? "",
  ownerName: process.env.EXPO_PUBLIC_OWNER_NAME ?? process.env.OWNER_NAME ?? "",
  cognitoIssuer: process.env.COGNITO_ISSUER ?? "",
  cognitoDomain: process.env.COGNITO_DOMAIN ?? "",
  cognitoClientId: process.env.COGNITO_CLIENT_ID ?? "",
  cognitoScopes,
};

const config: ExpoConfig = {
  name: env.appName,
  slug: env.appSlug,
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: env.scheme,
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: env.iosBundleId,
    "infoPlist": {
        "ITSAppUsesNonExemptEncryption": false
      }
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: env.androidPackage,
    permissions: ["POST_NOTIFICATIONS"],
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: env.scheme,
            host: "*",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-camera",
      {
        "cameraPermission": "Allow 37Club to access your camera",
        "microphonePermission": "Allow 37Club to access your microphone",
        "recordAudioAndroid": false
      }
    ],
    [
      "expo-audio",
      {
        microphonePermission: "Allow $(PRODUCT_NAME) to access your microphone.",
      },
    ],
    [
      "expo-video",
      {
        supportsBackgroundPlayback: true,
        supportsPictureInPicture: true,
      },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#000000",
        },
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          buildArchs: ["armeabi-v7a", "arm64-v8a"],
          minSdkVersion: 24,
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    appEnv: env.appEnv,
    dataSource: env.dataSource,
    apiBaseUrl: env.apiBaseUrl,
    oauthPortalUrl: env.oauthPortalUrl,
    oauthServerUrl: env.oauthServerUrl,
    appId: env.appId,
    ownerOpenId: env.ownerOpenId,
    ownerName: env.ownerName,
    cognitoIssuer: env.cognitoIssuer,
    cognitoDomain: env.cognitoDomain,
    cognitoClientId: env.cognitoClientId,
    cognitoScopes: env.cognitoScopes,
  },
};

export default config;
