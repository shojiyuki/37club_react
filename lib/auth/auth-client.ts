export type AuthTokenSet = {
  accessToken: string;
  idToken?: string;
  refreshToken?: string;
  accessTokenExpiresAt: number;
};

export interface AuthClient {
  signIn(): Promise<AuthTokenSet>;
  restore(): Promise<AuthTokenSet | null>;
  getValidAccessToken(): Promise<string | null>;
  signOut(): Promise<void>;
}
