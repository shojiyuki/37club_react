import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { DrizzleAppReviewConfigRepository } from "../repositories/app-review-config-repository";
import { DrizzleBlockRepository } from "../repositories/block-repository";
import { DrizzleParticipationRepository } from "../repositories/participation-repository";
import { BlockService, BlockServiceError } from "../services/block-service";
import { protectedProcedure, router } from "../_core/trpc";

function createBlockService(): BlockService {
  return new BlockService(
    new DrizzleBlockRepository(),
    new DrizzleParticipationRepository(),
    new DrizzleAppReviewConfigRepository(),
  );
}

function toTrpcError(error: unknown): never {
  if (error instanceof BlockServiceError) {
    const code =
      error.code === "BLOCK_TARGET_NOT_FOUND"
        ? "NOT_FOUND"
        : error.code === "BLOCK_TARGET_NOT_ACCESSIBLE"
          ? "FORBIDDEN"
          : "BAD_REQUEST";
    throw new TRPCError({ code, message: error.code });
  }
  throw error;
}

const blockTargetInput = z.object({
  targetUserId: z.number().int().positive(),
});

export const blocksRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await createBlockService().list(ctx.user.id);
    } catch (error) {
      return toTrpcError(error);
    }
  }),
  create: protectedProcedure
    .input(blockTargetInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createBlockService().create(ctx.user.id, input);
      } catch (error) {
        return toTrpcError(error);
      }
    }),
  remove: protectedProcedure
    .input(blockTargetInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createBlockService().remove(ctx.user.id, input);
      } catch (error) {
        return toTrpcError(error);
      }
    }),
});
