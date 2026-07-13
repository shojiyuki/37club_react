import type { Request } from "express";
import { describe, expect, it, vi } from "vitest";
import type { User } from "../drizzle/schema";
import { RequestAuthenticator } from "../server/auth/request-authenticator";
import type { AuthIdentity, TokenVerifier } from "../server/auth/token-verifier";

const identity: AuthIdentity = {
  provider: "cognito",
  issuer: "https://example.com/user-pool",
  subject: "cognito-subject",
};

const user: User = {
  id: 1,
  openId: null,
  name: null,
  email: null,
  loginMethod: null,
  role: "user",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
  deletedAt: null,
};

function createRequest(authorization?: string): Request {
  return { headers: { authorization } } as Request;
}

function createDependencies() {
  const tokenVerifier: TokenVerifier = { verify: vi.fn() };
  const userResolver = { resolve: vi.fn() };
  return { tokenVerifier, userResolver };
}

describe("RequestAuthenticator", () => {
  it("returns null when the request has no Bearer token", async () => {
    const dependencies = createDependencies();
    const authenticator = new RequestAuthenticator(
      dependencies.tokenVerifier,
      dependencies.userResolver,
    );

    await expect(authenticator.authenticate(createRequest())).resolves.toBeNull();
    expect(dependencies.tokenVerifier.verify).not.toHaveBeenCalled();
  });

  it("verifies the token and resolves the internal user", async () => {
    const dependencies = createDependencies();
    vi.mocked(dependencies.tokenVerifier.verify).mockResolvedValue(identity);
    dependencies.userResolver.resolve.mockResolvedValue(user);
    const authenticator = new RequestAuthenticator(
      dependencies.tokenVerifier,
      dependencies.userResolver,
    );

    await expect(
      authenticator.authenticate(createRequest("Bearer access-token")),
    ).resolves.toBe(user);
    expect(dependencies.tokenVerifier.verify).toHaveBeenCalledWith("access-token");
    expect(dependencies.userResolver.resolve).toHaveBeenCalledWith(identity);
  });

  it("returns null when token verification fails", async () => {
    const dependencies = createDependencies();
    vi.mocked(dependencies.tokenVerifier.verify).mockRejectedValue(new Error("Invalid token"));
    const authenticator = new RequestAuthenticator(
      dependencies.tokenVerifier,
      dependencies.userResolver,
    );

    await expect(
      authenticator.authenticate(createRequest("Bearer invalid-token")),
    ).resolves.toBeNull();
    expect(dependencies.userResolver.resolve).not.toHaveBeenCalled();
  });

  it("returns null when the resolved user is deleted", async () => {
    const dependencies = createDependencies();
    vi.mocked(dependencies.tokenVerifier.verify).mockResolvedValue(identity);
    dependencies.userResolver.resolve.mockResolvedValue({
      ...user,
      deletedAt: new Date("2026-07-13T00:00:00.000Z"),
    });
    const authenticator = new RequestAuthenticator(
      dependencies.tokenVerifier,
      dependencies.userResolver,
    );

    await expect(
      authenticator.authenticate(createRequest("Bearer access-token")),
    ).resolves.toBeNull();
  });

  it("does not hide database errors after successful token verification", async () => {
    const dependencies = createDependencies();
    const databaseError = new Error("Database unavailable");
    vi.mocked(dependencies.tokenVerifier.verify).mockResolvedValue(identity);
    dependencies.userResolver.resolve.mockRejectedValue(databaseError);
    const authenticator = new RequestAuthenticator(
      dependencies.tokenVerifier,
      dependencies.userResolver,
    );

    await expect(
      authenticator.authenticate(createRequest("Bearer access-token")),
    ).rejects.toBe(databaseError);
  });
});
