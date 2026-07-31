import { z } from "zod";

const selectByIdSchema = z
  .object({
    action: z.literal("select"),
    topicId: z.number().int().positive(),
  })
  .strict();

const selectUpcomingSchema = z
  .object({
    action: z.literal("select"),
    scope: z.literal("upcoming"),
    limit: z.number().int().min(1).max(50).default(50),
  })
  .strict();

export const topicManagementSelectInputSchema = z.union([
  selectByIdSchema,
  selectUpcomingSchema,
]);

export type TopicManagementSelectInput = z.infer<
  typeof topicManagementSelectInputSchema
>;
