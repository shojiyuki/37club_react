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

const tokyoDateTimeSchema = z.iso
  .datetime({ offset: true })
  .refine((value) => value.endsWith("+09:00"), {
    message: "startAt must use the +09:00 Japan time offset",
  });

const insertTopicSchema = z
  .object({
    startAt: tokyoDateTimeSchema,
    locationName: z.string().trim().min(1).max(255),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    prompt: z
      .string()
      .trim()
      .min(1)
      .max(255)
      .refine((value) => !/[\r\n]/.test(value), {
        message: "prompt must not contain line breaks",
      }),
  })
  .strict();

export const topicManagementInsertInputSchema = z
  .object({
    action: z.literal("insert"),
    topic: insertTopicSchema,
  })
  .strict();

export const topicManagementInputSchema = z.union([
  topicManagementSelectInputSchema,
  topicManagementInsertInputSchema,
]);

export type TopicManagementSelectInput = z.infer<
  typeof topicManagementSelectInputSchema
>;

export type TopicManagementInsertInput = z.infer<
  typeof topicManagementInsertInputSchema
>;
