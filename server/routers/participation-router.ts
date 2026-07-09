import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { DrizzleParticipationRepository } from "../repositories/participation-repository";
import {
  ParticipationService,
  ParticipationServiceError,
} from "../services/participation-service";
import { S3Storage } from "../storage/s3-storage";
import { protectedProcedure, router } from "../_core/trpc";

const participationRepository = new DrizzleParticipationRepository();
const participationService = new ParticipationService(participationRepository);

function createCheckInService(): ParticipationService {
  return new ParticipationService(participationRepository, undefined, new S3Storage());
}

function toTrpcError(error: unknown): never {
  if (error instanceof ParticipationServiceError) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: error.code,
    });
  }
  throw error;
}

export const participationRouter = router({
  current: protectedProcedure.query(({ ctx }) => participationService.getCurrent(ctx.user.id)),
  checkOut: protectedProcedure.mutation(({ ctx }) => participationService.checkOut(ctx.user.id)),
  checkIn: protectedProcedure
    .input(
      z.object({
        topicId: z.number().int().positive(),
        imageStorageKey: z.string().min(1).max(1024),
        caption: z.string().max(20),
        location: z.object({
          latitude: z.number(),
          longitude: z.number(),
          accuracy: z.number(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await createCheckInService().checkIn(ctx.user.id, input);
      } catch (error) {
        return toTrpcError(error);
      }
    }),
});
