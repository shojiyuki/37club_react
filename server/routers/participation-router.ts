import { DrizzleParticipationRepository } from "../repositories/participation-repository";
import { ParticipationService } from "../services/participation-service";
import { protectedProcedure, router } from "../_core/trpc";

const participationService = new ParticipationService(new DrizzleParticipationRepository());

export const participationRouter = router({
  current: protectedProcedure.query(({ ctx }) => participationService.getCurrent(ctx.user.id)),
  checkOut: protectedProcedure.mutation(({ ctx }) => participationService.checkOut(ctx.user.id)),
});
