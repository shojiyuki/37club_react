import { describe, expect, it, vi } from "vitest";
import { CognitoTokenVerifier } from "../server/auth/cognito-token-verifier";

describe("CognitoTokenVerifier", () => {
  it("normalizes a verified Cognito access token", async () => {
    const verify = vi.fn().mockResolvedValue({
      iss: "https://cognito-idp.example/test-pool",
      sub: "test-subject",
    });
    const verifier = new CognitoTokenVerifier(
      { userPoolId: "test-pool", clientId: "test-client" },
      { verify },
    );

    await expect(verifier.verify("valid-token")).resolves.toEqual({
      provider: "cognito",
      issuer: "https://cognito-idp.example/test-pool",
      subject: "test-subject",
    });
    expect(verify).toHaveBeenCalledWith("valid-token");
  });

  it("rejects a token rejected by the Cognito verifier", async () => {
    const verifier = new CognitoTokenVerifier(
      { userPoolId: "test-pool", clientId: "test-client" },
      { verify: vi.fn().mockRejectedValue(new Error("invalid token")) },
    );

    await expect(verifier.verify("invalid-token")).rejects.toThrow("invalid token");
  });
});
