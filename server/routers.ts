import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { accountRouter } from "./routers/account-router";
import { chatRouter } from "./routers/chat-router";
import { followRouter } from "./routers/follow-router";
import { participationRouter } from "./routers/participation-router";
import { postsRouter } from "./routers/posts-router";
import { storageRouter } from "./routers/storage-router";
import { topicsRouter } from "./routers/topics-router";

export const appRouter = router({
  account: accountRouter,
  chat: chatRouter,
  system: systemRouter,
  follow: followRouter,
  participation: participationRouter,
  posts: postsRouter,
  storage: storageRouter,
  topics: topicsRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
  }),
});

export type AppRouter = typeof appRouter;
