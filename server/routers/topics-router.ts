import { DrizzleTopicsRepository } from "../repositories/topics-repository";
import { TopicsService } from "../services/topics-service";
import { protectedProcedure, router } from "../_core/trpc";

function createTopicsService(): TopicsService {
  return new TopicsService(new DrizzleTopicsRepository());
}

export const topicsRouter = router({
  list: protectedProcedure.query(() => createTopicsService().list()),
});
