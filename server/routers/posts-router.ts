import { DrizzlePostsRepository } from "../repositories/posts-repository";
import { PostsService } from "../services/posts-service";
import { S3Storage } from "../storage/s3-storage";
import { protectedProcedure, router } from "../_core/trpc";

function createPostsService(): PostsService {
  return new PostsService(new DrizzlePostsRepository(), new S3Storage());
}

export const postsRouter = router({
  listCurrentTopic: protectedProcedure.query(({ ctx }) =>
    createPostsService().listCurrentTopicPosts(ctx.user.id),
  ),
  myCurrent: protectedProcedure.query(({ ctx }) =>
    createPostsService().getMyCurrentPost(ctx.user.id),
  ),
});
