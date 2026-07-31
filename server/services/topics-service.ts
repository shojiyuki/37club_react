import type {
  TopicRecord,
  TopicsRepository,
} from "../repositories/topics-repository";
import {
  noAppReviewConfigRepository,
  type AppReviewConfigRepository,
} from "../repositories/app-review-config-repository";
import { canUseDemoTopic } from "../domain/app-review";

export type TopicListItemResponse = {
  id: string;
  startAt: string;
  dateLabel: string;
  location: string;
  lat: number;
  lng: number;
  items: string;
  locationRequired: boolean;
};

type Clock = () => Date;

function formatDateLabel(date: Date): string {
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const byType = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${byType.year}/${byType.month}/${byType.day}（${byType.weekday}）${byType.hour}:${byType.minute}`;
}

export class TopicsService {
  constructor(
    private readonly repository: TopicsRepository,
    private readonly clock: Clock = () => new Date(),
    private readonly appReviewConfigRepository: AppReviewConfigRepository = noAppReviewConfigRepository,
  ) {}

  async list(): Promise<TopicListItemResponse[]> {
    const now = this.clock();
    const [records, appReviewConfigs] = await Promise.all([
      this.repository.findCurrentAndUpcoming(now),
      this.appReviewConfigRepository.findAll(),
    ]);
    const configuredDemoTopicIds = new Set(
      appReviewConfigs.map((config) => config.topicId),
    );
    const visibleRecords = records.filter(
      (record) => !configuredDemoTopicIds.has(record.id),
    );
    const items = visibleRecords.map((record) =>
      this.toTopicListItem(record, record.startAt, true),
    );

    const activeDemoConfigs = appReviewConfigs.filter((config) =>
      canUseDemoTopic(config, config.topicId, now),
    );
    const demoTopics = await Promise.all(
      activeDemoConfigs.map((config) =>
        this.repository.findById(config.topicId),
      ),
    );

    for (const demoTopic of demoTopics) {
      if (demoTopic) {
        items.push(this.toTopicListItem(demoTopic, now, false));
      }
    }

    return items;
  }

  private toTopicListItem(
    record: TopicRecord,
    effectiveStartAt: Date,
    locationRequired: boolean,
  ): TopicListItemResponse {
    return {
      id: String(record.id),
      startAt: effectiveStartAt.toISOString(),
      dateLabel: formatDateLabel(effectiveStartAt),
      location: record.locationName,
      lat: record.latitude,
      lng: record.longitude,
      items: record.prompt,
      locationRequired,
    };
  }
}
