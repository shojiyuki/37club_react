import { and, eq, or } from "drizzle-orm";

import { authAccounts, follows, participations, users } from "../../drizzle/schema";
import { getDb } from "../db";

export type DeleteAccountInput = {
  userId: number;
  deletedAt: Date;
};

export interface AccountRepository {
  deleteAccount(input: DeleteAccountInput): Promise<void>;
}

export class DrizzleAccountRepository implements AccountRepository {
  async deleteAccount(input: DeleteAccountInput): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database is not available");

    await db.transaction(async (tx) => {
      await tx
        .update(participations)
        .set({
          status: "checked_out",
          checkedOutAt: input.deletedAt,
          updatedAt: input.deletedAt,
        })
        .where(and(eq(participations.userId, input.userId), eq(participations.status, "active")));

      await tx
        .delete(follows)
        .where(or(eq(follows.followerUserId, input.userId), eq(follows.followingUserId, input.userId)));

      await tx.delete(authAccounts).where(eq(authAccounts.userId, input.userId));

      await tx
        .update(users)
        .set({
          openId: null,
          name: null,
          email: null,
          loginMethod: null,
          deletedAt: input.deletedAt,
          updatedAt: input.deletedAt,
        })
        .where(eq(users.id, input.userId));
    });
  }
}
