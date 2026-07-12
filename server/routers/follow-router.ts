import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { DrizzleFollowRepository } from "../repositories/follow-repository";
import { FollowService, FollowServiceError } from "../services/follow-service";
import { protectedProcedure, router } from "../_core/trpc";

function createFollowService(): FollowService {
  return new FollowService(new DrizzleFollowRepository());
}

function toTrpcError(error: unknown): never {
  if (error instanceof FollowServiceError) {
    throw new TRPCError({
      code: error.code === "NOT_ACTIVE_IN_SAME_TOPIC" ? "FORBIDDEN" : "BAD_REQUEST",
      message: error.code,
    });
  }
  throw error;
}

export const followRouter = router({
  setFollowing: protectedProcedure
    .input(
      z.object({
        targetUserId: z.number().int().positive(),
        following: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await createFollowService().setFollowing(ctx.user.id, input);
      } catch (error) {
        return toTrpcError(error);
      }
    }),
});
