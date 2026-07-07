import Constants from "expo-constants";

export type AppEnv = "local" | "development" | "production";
export type DataSource = "mock" | "api";

type RuntimeConfig = {
  appEnv: AppEnv;
  dataSource: DataSource;
  apiBaseUrl: string;
  oauthPortalUrl: string;
  oauthServerUrl: string;
  appId: string;
  ownerOpenId: string;
  ownerName: string;
  cognitoIssuer: string;
  cognitoDomain: string;
  cognitoClientId: string;
  cognitoScopes: string[];
};

const extra = (Constants.expoConfig?.extra ?? {}) as Partial<RuntimeConfig>;

function resolveAppEnv(value: unknown): AppEnv {
  return value === "development" || value === "production" ? value : "local";
}

function resolveDataSource(value: unknown): DataSource {
  return value === "api" ? "api" : "mock";
}

export const runtimeConfig: RuntimeConfig = {
  appEnv: resolveAppEnv(extra.appEnv),
  dataSource: resolveDataSource(extra.dataSource),
  apiBaseUrl: typeof extra.apiBaseUrl === "string" ? extra.apiBaseUrl : "",
  oauthPortalUrl: typeof extra.oauthPortalUrl === "string" ? extra.oauthPortalUrl : "",
  oauthServerUrl: typeof extra.oauthServerUrl === "string" ? extra.oauthServerUrl : "",
  appId: typeof extra.appId === "string" ? extra.appId : "",
  ownerOpenId: typeof extra.ownerOpenId === "string" ? extra.ownerOpenId : "",
  ownerName: typeof extra.ownerName === "string" ? extra.ownerName : "",
  cognitoIssuer: typeof extra.cognitoIssuer === "string" ? extra.cognitoIssuer : "",
  cognitoDomain: typeof extra.cognitoDomain === "string" ? extra.cognitoDomain : "",
  cognitoClientId: typeof extra.cognitoClientId === "string" ? extra.cognitoClientId : "",
  cognitoScopes: Array.isArray(extra.cognitoScopes)
    ? extra.cognitoScopes.filter((scope): scope is string => typeof scope === "string")
    : [],
};
