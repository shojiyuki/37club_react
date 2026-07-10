import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { DrizzleChatRepository } from "../repositories/chat-repository";
import { ChatService, ChatServiceError } from "../services/chat-service";
import { S3Storage } from "../storage/s3-storage";
import { protectedProcedure, router } from "../_core/trpc";

function createChatService(): ChatService {
  return new ChatService(new DrizzleChatRepository(), new S3Storage());
}

function toTrpcError(error: unknown): never {
  if (error instanceof ChatServiceError) {
    throw new TRPCError({
      code: error.code === "NOT_MUTUAL" ? "FORBIDDEN" : "BAD_REQUEST",
      message: error.code,
    });
  }
  throw error;
}

export const chatRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await createChatService().list(ctx.user.id);
    } catch (error) {
      return toTrpcError(error);
    }
  }),

  messages: protectedProcedure
    .input(
      z.object({
        targetUserId: z.number().int().positive(),
        limit: z.number().int().positive().max(100).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        return await createChatService().messages(ctx.user.id, input);
      } catch (error) {
        return toTrpcError(error);
      }
    }),

  sendMessage: protectedProcedure
    .input(
      z.object({
        targetUserId: z.number().int().positive(),
        body: z.string().max(1000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await createChatService().sendMessage(ctx.user.id, input);
      } catch (error) {
        return toTrpcError(error);
      }
    }),
});
