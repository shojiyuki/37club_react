import { z } from "zod";

import {
  ALLOWED_IMAGE_CONTENT_TYPES,
  MAX_UPLOAD_IMAGE_BYTES,
  StorageService,
} from "../services/storage-service";
import { S3Storage } from "../storage/s3-storage";
import { protectedProcedure, router } from "../_core/trpc";

function createStorageService(): StorageService {
  return new StorageService(new S3Storage());
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
});
