import { DrizzleAccountRepository } from "../repositories/account-repository";
import { AccountService } from "../services/account-service";
import { protectedProcedure, router } from "../_core/trpc";

function createAccountService(): AccountService {
  return new AccountService(new DrizzleAccountRepository());
}

export const accountRouter = router({
  deleteMe: protectedProcedure.mutation(async ({ ctx }) => {
    return await createAccountService().deleteMe(ctx.user.id);
  }),
});
