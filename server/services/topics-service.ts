import type { TopicRecord, TopicsRepository } from "../repositories/topics-repository";

export type TopicListItemResponse = {
  id: string;
  startAt: string;
  dateLabel: string;
  location: string;
  lat: number;
  lng: number;
  items: string;
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
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${byType.year}/${byType.month}/${byType.day}（${byType.weekday}）${byType.hour}:${byType.minute}`;
}

export class TopicsService {
  constructor(
    private readonly repository: TopicsRepository,
    private readonly clock: Clock = () => new Date(),
  ) {}

  async list(): Promise<TopicListItemResponse[]> {
    const records = await this.repository.findCurrentAndUpcoming(this.clock());
    return records.map((record) => this.toTopicListItem(record));
  }

  private toTopicListItem(record: TopicRecord): TopicListItemResponse {
    return {
      id: String(record.id),
      startAt: record.startAt.toISOString(),
      dateLabel: formatDateLabel(record.startAt),
      location: record.locationName,
      lat: record.latitude,
      lng: record.longitude,
      items: record.prompt,
    };
  }
}
