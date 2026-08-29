import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { DrizzlePostsRepository } from "../repositories/posts-repository";
import { DrizzleFollowRepository } from "../repositories/follow-repository";
import { DrizzleAppReviewConfigRepository } from "../repositories/app-review-config-repository";
import { DrizzleParticipationRepository } from "../repositories/participation-repository";
import { DrizzlePostCommentsRepository } from "../repositories/post-comments-repository";
import { PostsService } from "../services/posts-service";
import {
  PostCommentsService,
  PostCommentsServiceError,
} from "../services/post-comments-service";
import { S3Storage } from "../storage/s3-storage";
import { protectedProcedure, router } from "../_core/trpc";

function createPostsService(): PostsService {
  return new PostsService(
    new DrizzlePostsRepository(),
    new S3Storage(),
    new DrizzleFollowRepository(),
  );
}

function createPostCommentsService(): PostCommentsService {
  return new PostCommentsService(
    new DrizzlePostCommentsRepository(),
    new DrizzleParticipationRepository(),
    new DrizzleAppReviewConfigRepository(),
  );
}

function toPostCommentTrpcError(error: unknown): never {
  if (error instanceof PostCommentsServiceError) {
    const code =
      error.code === "POST_NOT_FOUND"
        ? "NOT_FOUND"
        : error.code === "EMPTY_COMMENT" || error.code === "COMMENT_TOO_LONG"
          ? "BAD_REQUEST"
          : "FORBIDDEN";
    throw new TRPCError({ code, message: error.code });
  }
  throw error;
}

export const postsRouter = router({
  listCurrentTopic: protectedProcedure.query(({ ctx }) =>
    createPostsService().listCurrentTopicPosts(ctx.user.id),
  ),
  myCurrent: protectedProcedure.query(({ ctx }) =>
    createPostsService().getMyCurrentPost(ctx.user.id),
  ),
  comments: protectedProcedure
    .input(z.object({ postId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      try {
        return await createPostCommentsService().list(ctx.user.id, input);
      } catch (error) {
        return toPostCommentTrpcError(error);
      }
    }),
  createComment: protectedProcedure
    .input(
      z.object({
        postId: z.number().int().positive(),
        body: z.string().max(200),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await createPostCommentsService().create(ctx.user.id, input);
      } catch (error) {
        return toPostCommentTrpcError(error);
      }
    }),
});
