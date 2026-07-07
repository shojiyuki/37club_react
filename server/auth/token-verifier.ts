export type AuthIdentity = {
  provider: string;
  issuer: string;
  subject: string;
};

export interface TokenVerifier {
  verify(token: string): Promise<AuthIdentity>;
}
