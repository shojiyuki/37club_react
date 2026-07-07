import {
  AuthRequest,
  ResponseType,
  TokenTypeHint,
  exchangeCodeAsync,
  fetchDiscoveryAsync,
  makeRedirectUri,
  refreshAsync,
  revokeAsync,
  type DiscoveryDocument,
  type TokenResponse,
} from "expo-auth-session";
import { runtimeConfig } from "@/constants/runtime-config";
import type { AuthClient, AuthTokenSet } from "./auth-client";
import {
  clearTokenSet,
  getMemoryTokenSet,
  getStoredRefreshToken,
  setTokenSet,
} from "./auth-token-store";

const ACCESS_TOKEN_REFRESH_MARGIN_MS = 60_000;
const DEFAULT_ACCESS_TOKEN_LIFETIME_SECONDS = 3_600;

function requireCognitoConfig() {
  const { cognitoIssuer, cognitoDomain, cognitoClientId, cognitoScopes } = runtimeConfig;

  if (!cognitoIssuer || !cognitoDomain || !cognitoClientId || cognitoScopes.length === 0) {
    throw new Error("Cognito configuration is incomplete");
  }

  return {
    issuer: cognitoIssuer.replace(/\/$/, ""),
    domain: cognitoDomain.replace(/\/$/, ""),
    clientId: cognitoClientId,
    scopes: cognitoScopes,
  };
}

function createRedirectUri(): string {
  return makeRedirectUri({
    native: "club37://auth/callback",
    scheme: "club37",
    path: "oauth/callback",
    preferLocalhost: true,
  });
}

function toAuthTokenSet(response: TokenResponse, refreshToken?: string): AuthTokenSet {
  const issuedAt = response.issuedAt ?? Date.now() / 1_000;
  const expiresIn = response.expiresIn ?? DEFAULT_ACCESS_TOKEN_LIFETIME_SECONDS;

  return {
    accessToken: response.accessToken,
    idToken: response.idToken,
    refreshToken: response.refreshToken ?? refreshToken,
    accessTokenExpiresAt: (issuedAt + expiresIn) * 1_000,
  };
}

function isAccessTokenFresh(tokenSet: AuthTokenSet): boolean {
  return Date.now() + ACCESS_TOKEN_REFRESH_MARGIN_MS < tokenSet.accessTokenExpiresAt;
}

export class CognitoAuthClient implements AuthClient {
  private discoveryPromise: Promise<DiscoveryDocument> | null = null;

  private getDiscovery(): Promise<DiscoveryDocument> {
    if (!this.discoveryPromise) {
      this.discoveryPromise = fetchDiscoveryAsync(requireCognitoConfig().issuer);
    }
    return this.discoveryPromise;
  }

  private async refresh(refreshToken: string): Promise<AuthTokenSet> {
    const config = requireCognitoConfig();
    const discovery = await this.getDiscovery();
    const response = await refreshAsync(
      {
        clientId: config.clientId,
        refreshToken,
      },
      discovery,
    );
    const tokenSet = toAuthTokenSet(response, refreshToken);
    await setTokenSet(tokenSet);
    return tokenSet;
  }

  async signIn(): Promise<AuthTokenSet> {
    const config = requireCognitoConfig();
    const discovery = await this.getDiscovery();
    const redirectUri = createRedirectUri();
    const request = new AuthRequest({
      clientId: config.clientId,
      redirectUri,
      responseType: ResponseType.Code,
      scopes: config.scopes,
      usePKCE: true,
    });
    const result = await request.promptAsync(discovery);

    if (result.type !== "success") {
      throw new Error(`Cognito sign-in did not complete: ${result.type}`);
    }

    const code = result.params.code;
    const codeVerifier = request.codeVerifier;
    if (!code || !codeVerifier) {
      throw new Error("Cognito sign-in response is missing the authorization code or PKCE verifier");
    }

    const response = await exchangeCodeAsync(
      {
        clientId: config.clientId,
        code,
        redirectUri,
        extraParams: { code_verifier: codeVerifier },
      },
      discovery,
    );
    const tokenSet = toAuthTokenSet(response);
    await setTokenSet(tokenSet);
    return tokenSet;
  }

  async restore(): Promise<AuthTokenSet | null> {
    const current = getMemoryTokenSet();
    if (current && isAccessTokenFresh(current)) return current;

    const refreshToken = current?.refreshToken ?? (await getStoredRefreshToken());
    if (!refreshToken) return null;

    try {
      return await this.refresh(refreshToken);
    } catch {
      await clearTokenSet();
      return null;
    }
  }

  async getValidAccessToken(): Promise<string | null> {
    const current = getMemoryTokenSet();
    if (current && isAccessTokenFresh(current)) return current.accessToken;

    const restored = await this.restore();
    return restored?.accessToken ?? null;
  }

  async signOut(): Promise<void> {
    const config = requireCognitoConfig();
    const current = getMemoryTokenSet();
    const refreshToken = current?.refreshToken ?? (await getStoredRefreshToken());

    try {
      if (refreshToken) {
        const discovery = await this.getDiscovery();
        await revokeAsync(
          {
            clientId: config.clientId,
            token: refreshToken,
            tokenTypeHint: TokenTypeHint.RefreshToken,
          },
          {
            revocationEndpoint:
              discovery.revocationEndpoint ?? `${config.domain}/oauth2/revoke`,
          },
        );
      }
    } finally {
      await clearTokenSet();
    }
  }
}

export const cognitoAuthClient = new CognitoAuthClient();
