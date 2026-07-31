import type { AppReviewConfig } from "../../drizzle/schema";

export const APP_REVIEW_TOPIC_DURATION_MS = 37 * 60 * 1000;

export function isConfiguredDemoTopic(
  config: AppReviewConfig | undefined,
  topicId: number,
): boolean {
  return config?.topicId === topicId;
}

export function canUseDemoTopic(
  config: AppReviewConfig | undefined,
  topicId: number,
  now: Date,
): boolean {
  return Boolean(
    config &&
    config.topicId === topicId &&
    config.enabled &&
    config.expiresAt > now,
  );
}

export function getDemoParticipationEndAt(checkedInAt: Date): Date {
  return new Date(checkedInAt.getTime() + APP_REVIEW_TOPIC_DURATION_MS);
}
