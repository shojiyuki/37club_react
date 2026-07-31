import type {
  TopicRecord,
  TopicsRepository,
} from "../repositories/topics-repository";
import type { TopicManagementSelectInput } from "./topic-management-schema";

export type ManagedTopic = {
  topicId: number;
  startAt: string;
  startAtJst: string;
  endAt: string;
  endAtJst: string;
  locationName: string;
  latitude: number;
  longitude: number;
  prompt: string;
  createdAt: string;
  updatedAt: string;
};

export type TopicManagementSelectResult = {
  action: "select";
  count: number;
  topics: ManagedTopic[];
};

type Clock = () => Date;

export class TopicManagementTopicNotFoundError extends Error {
  constructor(readonly topicId: number) {
    super(`Topic ${topicId} was not found`);
    this.name = "TopicManagementTopicNotFoundError";
  }
}

function formatTokyoIso(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const byType = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${byType.year}-${byType.month}-${byType.day}T${byType.hour}:${byType.minute}:${byType.second}+09:00`;
}

function toManagedTopic(record: TopicRecord): ManagedTopic {
  return {
    topicId: record.id,
    startAt: record.startAt.toISOString(),
    startAtJst: formatTokyoIso(record.startAt),
    endAt: record.endAt.toISOString(),
    endAtJst: formatTokyoIso(record.endAt),
    locationName: record.locationName,
    latitude: record.latitude,
    longitude: record.longitude,
    prompt: record.prompt,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export class TopicManagementService {
  constructor(
    private readonly repository: TopicsRepository,
    private readonly clock: Clock = () => new Date(),
  ) {}

  async select(
    input: TopicManagementSelectInput,
  ): Promise<TopicManagementSelectResult> {
    if ("topicId" in input) {
      const record = await this.repository.findById(input.topicId);
      if (!record) {
        throw new TopicManagementTopicNotFoundError(input.topicId);
      }

      return {
        action: "select",
        count: 1,
        topics: [toManagedTopic(record)],
      };
    }

    const records = await this.repository.findCurrentAndUpcoming(this.clock());
    const selectedRecords = records.slice(0, input.limit);

    return {
      action: "select",
      count: selectedRecords.length,
      topics: selectedRecords.map(toManagedTopic),
    };
  }
}
