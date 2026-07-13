import { describe, expect, it, vi } from "vitest";

import type { AccountRepository } from "../server/repositories/account-repository";
import { AccountService } from "../server/services/account-service";

const NOW = new Date("2026-07-13T03:00:00.000Z");

function createRepository(overrides: Partial<AccountRepository> = {}): AccountRepository {
  return {
    deleteAccount: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("AccountService", () => {
  it("deletes the authenticated user by server-side user id", async () => {
    const repository = createRepository();
    const service = new AccountService(repository, () => NOW);

    await expect(service.deleteMe(1)).resolves.toEqual({
      deletedAt: "2026-07-13T03:00:00.000Z",
    });

    expect(repository.deleteAccount).toHaveBeenCalledWith({
      userId: 1,
      deletedAt: NOW,
    });
  });
});
