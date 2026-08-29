import type { AppReviewConfig } from "../../drizzle/schema";
import {
  canUseDemoTopic,
  getDemoParticipationEndAt,
  isConfiguredDemoTopic,
} from "./app-review";

export type ParticipationExpiryInput = {
  topicId: number;
  topicEndAt: Date;
  checkedInAt: Date;
  appReviewConfig: AppReviewConfig | undefined;
  now: Date;
};

export function resolveParticipationExpiresAt(
  input: ParticipationExpiryInput,
): Date | null {
  if (!isConfiguredDemoTopic(input.appReviewConfig, input.topicId)) {
    return input.topicEndAt;
  }
  if (!canUseDemoTopic(input.appReviewConfig, input.topicId, input.now)) {
    return null;
  }
  return getDemoParticipationEndAt(input.checkedInAt);
}
