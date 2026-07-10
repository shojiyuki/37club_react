import { z } from "zod";

import {
  ALLOWED_IMAGE_CONTENT_TYPES,
  MAX_UPLOAD_IMAGE_BYTES,
  StorageService,
  StorageServiceError,
} from "../services/storage-service";
import { DrizzleParticipationRepository } from "../repositories/participation-repository";
import { S3Storage } from "../storage/s3-storage";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";

function createStorageService(): StorageService {
  return new StorageService(
    new S3Storage(),
    undefined,
    undefined,
    new DrizzleParticipationRepository(),
  );
}

function toTrpcError(error: unknown): never {
  if (error instanceof StorageServiceError) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: error.code,
    });
  }
  throw error;
}

export const storageRouter = router({
  createUploadUrl: protectedProcedure
    .input(
      z.object({
        contentType: z.enum(ALLOWED_IMAGE_CONTENT_TYPES),
        contentLength: z.number().int().positive().max(MAX_UPLOAD_IMAGE_BYTES),
      }),
    )
    .mutation(({ ctx, input }) =>
      createStorageService().createUploadTarget({
        userId: ctx.user.id,
        contentType: input.contentType,
        contentLength: input.contentLength,
      }),
    ),
  discardUpload: protectedProcedure
    .input(
      z.object({
        imageStorageKey: z.string().min(1).max(1024),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await createStorageService().discardUpload({
          userId: ctx.user.id,
          imageStorageKey: input.imageStorageKey,
        });
      } catch (error) {
        return toTrpcError(error);
      }
    }),
});
