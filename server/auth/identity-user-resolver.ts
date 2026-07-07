import type { User } from "../../drizzle/schema";
import type { AuthAccountRepository } from "../repositories/auth-account-repository";
import type { AuthIdentity } from "./token-verifier";

export class IdentityUserResolver {
  constructor(private readonly authAccounts: AuthAccountRepository) {}

  async resolve(identity: AuthIdentity): Promise<User> {
    const existingUser = await this.authAccounts.findUserByIdentity(identity);
    if (existingUser) return existingUser;

    try {
      return await this.authAccounts.createUserForIdentity(identity);
    } catch (error) {
      // A concurrent first request may have created the same unique identity.
      const concurrentlyCreatedUser = await this.authAccounts.findUserByIdentity(identity);
      if (concurrentlyCreatedUser) return concurrentlyCreatedUser;
      throw error;
    }
  }
}
