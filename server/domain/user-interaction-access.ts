import type { AppReviewConfig } from "../../drizzle/schema";
import type { ActiveParticipationRecord } from "../repositories/participation-repository";
import { resolveParticipationExpiresAt } from "./participation-access";

export function isParticipationEffective(input: {
  record: ActiveParticipationRecord | undefined;
  appReviewConfig: AppReviewConfig | undefined;
  now: Date;
}): boolean {
  if (!input.record) return false;
  const expiresAt = resolveParticipationExpiresAt({
    topicId: input.record.topic.id,
    topicEndAt: input.record.topic.endAt,
    checkedInAt: input.record.participation.checkedInAt,
    appReviewConfig: input.appReviewConfig,
    now: input.now,
  });
  return Boolean(expiresAt && expiresAt > input.now);
}

export function areUsersEffectiveActiveInSameTopic(input: {
  first: ActiveParticipationRecord | undefined;
  second: ActiveParticipationRecord | undefined;
  appReviewConfig: AppReviewConfig | undefined;
  now: Date;
}): boolean {
  if (!input.first || !input.second) return false;
  if (input.first.topic.id !== input.second.topic.id) return false;

  return (
    isParticipationEffective({
      record: input.first,
      appReviewConfig: input.appReviewConfig,
      now: input.now,
    }) &&
    isParticipationEffective({
      record: input.second,
      appReviewConfig: input.appReviewConfig,
      now: input.now,
    })
  );
}
