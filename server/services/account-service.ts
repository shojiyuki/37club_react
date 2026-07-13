import type { AccountRepository } from "../repositories/account-repository";

type Clock = () => Date;

export type DeleteAccountResponse = {
  deletedAt: string;
};

export class AccountService {
  constructor(
    private readonly repository: AccountRepository,
    private readonly clock: Clock = () => new Date(),
  ) {}

  async deleteMe(userId: number): Promise<DeleteAccountResponse> {
    const deletedAt = this.clock();
    await this.repository.deleteAccount({ userId, deletedAt });

    return {
      deletedAt: deletedAt.toISOString(),
    };
  }
}
