import { CognitoJwtVerifier } from "aws-jwt-verify";
import type { AuthIdentity, TokenVerifier } from "./token-verifier";

type VerifiedCognitoAccessToken = {
  iss: string;
  sub: string;
};

type CognitoVerifier = {
  verify(token: string): Promise<VerifiedCognitoAccessToken>;
};

type CognitoTokenVerifierConfig = {
  userPoolId: string;
  clientId: string;
};

export class CognitoTokenVerifier implements TokenVerifier {
  private readonly verifier: CognitoVerifier;

  constructor(config: CognitoTokenVerifierConfig, verifier?: CognitoVerifier) {
    this.verifier =
      verifier ??
      CognitoJwtVerifier.create({
        userPoolId: config.userPoolId,
        clientId: config.clientId,
        tokenUse: "access",
      });
  }

  async verify(token: string): Promise<AuthIdentity> {
    const payload = await this.verifier.verify(token);

    return {
      provider: "cognito",
      issuer: payload.iss,
      subject: payload.sub,
    };
  }
}
