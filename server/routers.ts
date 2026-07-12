import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { chatRouter } from "./routers/chat-router";
import { followRouter } from "./routers/follow-router";
import { participationRouter } from "./routers/participation-router";
import { postsRouter } from "./routers/posts-router";
import { storageRouter } from "./routers/storage-router";
import { topicsRouter } from "./routers/topics-router";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
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

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
