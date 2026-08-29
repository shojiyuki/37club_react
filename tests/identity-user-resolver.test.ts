import { describe, expect, it, vi } from "vitest";
import type { User } from "../drizzle/schema";
import { IdentityUserResolver } from "../server/auth/identity-user-resolver";
import type { AuthAccountRepository } from "../server/repositories/auth-account-repository";

const identity = {
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
  suspendedAt: null,
  deletedAt: null,
};

function createRepository(): AuthAccountRepository {
  return {
    findUserByIdentity: vi.fn(),
    createUserForIdentity: vi.fn(),
  };
}

describe("IdentityUserResolver", () => {
  it("returns the user already linked to the identity", async () => {
    const repository = createRepository();
    vi.mocked(repository.findUserByIdentity).mockResolvedValue(user);
    const resolver = new IdentityUserResolver(repository);

    await expect(resolver.resolve(identity)).resolves.toBe(user);
    expect(repository.createUserForIdentity).not.toHaveBeenCalled();
  });

  it("creates a user for a previously unseen identity", async () => {
    const repository = createRepository();
    vi.mocked(repository.findUserByIdentity).mockResolvedValue(undefined);
    vi.mocked(repository.createUserForIdentity).mockResolvedValue(user);
    const resolver = new IdentityUserResolver(repository);

    await expect(resolver.resolve(identity)).resolves.toBe(user);
    expect(repository.createUserForIdentity).toHaveBeenCalledWith(identity);
  });

  it("loads the winner when concurrent first requests create the same identity", async () => {
    const repository = createRepository();
    vi.mocked(repository.findUserByIdentity)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(user);
    vi.mocked(repository.createUserForIdentity).mockRejectedValue(new Error("Duplicate entry"));
    const resolver = new IdentityUserResolver(repository);

    await expect(resolver.resolve(identity)).resolves.toBe(user);
    expect(repository.findUserByIdentity).toHaveBeenCalledTimes(2);
  });

  it("preserves the creation error when no concurrent user exists", async () => {
    const repository = createRepository();
    const creationError = new Error("Database write failed");
    vi.mocked(repository.findUserByIdentity).mockResolvedValue(undefined);
    vi.mocked(repository.createUserForIdentity).mockRejectedValue(creationError);
    const resolver = new IdentityUserResolver(repository);

    await expect(resolver.resolve(identity)).rejects.toBe(creationError);
  });
});
