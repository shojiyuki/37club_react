import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { DrizzleAppReviewConfigRepository } from "../repositories/app-review-config-repository";
import { DrizzleBlockRepository } from "../repositories/block-repository";
import { DrizzleChatRepository } from "../repositories/chat-repository";
import { DrizzleParticipationRepository } from "../repositories/participation-repository";
import { DrizzleReportRepository } from "../repositories/report-repository";
import { ReportService, ReportServiceError } from "../services/report-service";
import { protectedProcedure, router } from "../_core/trpc";

function createReportService(): ReportService {
  return new ReportService(
    new DrizzleReportRepository(),
    new DrizzleBlockRepository(),
    new DrizzleParticipationRepository(),
    new DrizzleAppReviewConfigRepository(),
    new DrizzleChatRepository(),
  );
}

function toTrpcError(error: unknown): never {
  if (error instanceof ReportServiceError) {
    const code =
      error.code === "REPORT_TARGET_NOT_FOUND"
        ? "NOT_FOUND"
        : error.code === "REPORT_DETAILS_TOO_LONG"
          ? "BAD_REQUEST"
          : "FORBIDDEN";
    throw new TRPCError({ code, message: error.code });
  }
  throw error;
}

const reportInput = z
  .object({
    targetType: z.enum(["post", "message", "user"]),
    targetId: z.number().int().positive(),
    reason: z.enum([
      "spam",
      "harassment",
      "sexual_content",
      "violence",
      "personal_information",
      "impersonation",
      "other",
    ]),
    details: z.string().max(500).optional(),
  })
  .strict();

export const reportsRouter = router({
  create: protectedProcedure
    .input(reportInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createReportService().create(ctx.user.id, input);
      } catch (error) {
        return toTrpcError(error);
      }
    }),
});
