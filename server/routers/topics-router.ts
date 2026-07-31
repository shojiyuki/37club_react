import { DrizzleTopicsRepository } from "../repositories/topics-repository";
import { DrizzleAppReviewConfigRepository } from "../repositories/app-review-config-repository";
import { TopicsService } from "../services/topics-service";
import { protectedProcedure, router } from "../_core/trpc";

function createTopicsService(): TopicsService {
  return new TopicsService(
    new DrizzleTopicsRepository(),
    undefined,
    new DrizzleAppReviewConfigRepository(),
  );
}

export const topicsRouter = router({
  list: protectedProcedure.query(() => createTopicsService().list()),
});
