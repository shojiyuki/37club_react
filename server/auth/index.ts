import { ENV } from "../_core/env";
import { DrizzleAuthAccountRepository } from "../repositories/auth-account-repository";
import { CognitoTokenVerifier } from "./cognito-token-verifier";
import { IdentityUserResolver } from "./identity-user-resolver";
import { RequestAuthenticator } from "./request-authenticator";
import type { TokenVerifier } from "./token-verifier";

let tokenVerifier: TokenVerifier | null = null;
let identityUserResolver: IdentityUserResolver | null = null;
let requestAuthenticator: RequestAuthenticator | null = null;

function getUserPoolId(issuer: string): string {
  try {
    const pathSegments = new URL(issuer).pathname.split("/").filter(Boolean);
    const userPoolId = pathSegments.at(-1);
    if (userPoolId) return userPoolId;
  } catch {
    // Handled by the configuration error below.
  }

  throw new Error("COGNITO_ISSUER must contain a valid Cognito User Pool ID");
}

export function getTokenVerifier(): TokenVerifier {
  if (tokenVerifier) return tokenVerifier;
  if (!ENV.cognitoIssuer || !ENV.cognitoClientId) {
    throw new Error("Cognito server configuration is incomplete");
  }

  tokenVerifier = new CognitoTokenVerifier({
    userPoolId: getUserPoolId(ENV.cognitoIssuer),
    clientId: ENV.cognitoClientId,
  });
  return tokenVerifier;
}

export function getIdentityUserResolver(): IdentityUserResolver {
  identityUserResolver ??= new IdentityUserResolver(new DrizzleAuthAccountRepository());
  return identityUserResolver;
}

export function getRequestAuthenticator(): RequestAuthenticator {
  requestAuthenticator ??= new RequestAuthenticator(
    getTokenVerifier(),
    getIdentityUserResolver(),
  );
  return requestAuthenticator;
}

export type { AuthIdentity, TokenVerifier } from "./token-verifier";
