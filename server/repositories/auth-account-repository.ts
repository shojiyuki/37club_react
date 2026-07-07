import { and, eq } from "drizzle-orm";
import { authAccounts, users, type User } from "../../drizzle/schema";
import type { AuthIdentity } from "../auth/token-verifier";
import { getDb } from "../db";

export interface AuthAccountRepository {
  findUserByIdentity(identity: AuthIdentity): Promise<User | undefined>;
  createUserForIdentity(identity: AuthIdentity): Promise<User>;
}

export class DrizzleAuthAccountRepository implements AuthAccountRepository {
  async findUserByIdentity(identity: AuthIdentity): Promise<User | undefined> {
    const db = await getDb();
    if (!db) throw new Error("Database is not available");

    const result = await db
      .select({ user: users })
      .from(authAccounts)
      .innerJoin(users, eq(authAccounts.userId, users.id))
      .where(and(eq(authAccounts.issuer, identity.issuer), eq(authAccounts.subject, identity.subject)))
      .limit(1);

    return result[0]?.user;
  }

  async createUserForIdentity(identity: AuthIdentity): Promise<User> {
    const db = await getDb();
    if (!db) throw new Error("Database is not available");

    return db.transaction(async (tx) => {
      const [insertResult] = await tx.insert(users).values({ openId: null });
      const userId = insertResult.insertId;

      await tx.insert(authAccounts).values({
        userId,
        provider: identity.provider,
        issuer: identity.issuer,
        subject: identity.subject,
      });

      const createdUsers = await tx.select().from(users).where(eq(users.id, userId)).limit(1);
      const createdUser = createdUsers[0];
      if (!createdUser) throw new Error("Created user could not be loaded");

      return createdUser;
    });
  }
}
