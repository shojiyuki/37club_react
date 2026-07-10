import type {
  AppMyPost,
  AppTopic,
  CheckInParticipationInput,
  CreateUploadUrlInput,
  CurrentParticipation,
  DataSources,
  SetFollowingInput,
} from "./types";
import { MOCK_POSTS } from "../mock-data";

function buildMockTopics(): AppTopic[] {
  function getLiveStartTime(minutesAgo: number): string {
    return new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();
  }

  return [
    {
      id: "demo",
      startAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      dateLabel: "DEMO — いつでも参加可能",
      location: "ANY LOCATION",
      lat: 35.6895,
      lng: 139.6917,
      items: "自由に撮影してみよう",
      isDemo: true,
    },
    {
      id: "1",
      startAt: getLiveStartTime(31.8),
      dateLabel: "2026/06/12（金）06:00",
      location: "渋谷駅 ハチ公前",
      lat: 35.6595,
      lng: 139.7005,
      items: "赤いもの",
    },
    {
      id: "2",
      startAt: getLiveStartTime(18.2),
      dateLabel: "2026/06/12（金）06:00",
      location: "上野公園 西郷隆盛像前",
      lat: 35.7119,
      lng: 139.771,
      items: "サングラス",
    },
    {
      id: "3",
      startAt: "2026-06-15T06:00:00+09:00",
      dateLabel: "2026/06/15（月）06:00",
      location: "東京タワー 正面入口",
      lat: 35.6586,
      lng: 139.7454,
      items: "白いTシャツ",
    },
    {
      id: "4",
      startAt: "2026-06-18T06:00:00+09:00",
      dateLabel: "2026/06/18（木）06:00",
      location: "鎌倉駅 東口広場",
      lat: 35.3193,
      lng: 139.5503,
      items: "本",
    },
    {
      id: "5",
      startAt: "2026-06-22T06:00:00+09:00",
      dateLabel: "2026/06/22（月）06:00",
      location: "大阪城公園 大手門前",
      lat: 34.6873,
      lng: 135.5262,
      items: "帽子",
    },
  ];
}

const MOCK_MY_POST: AppMyPost = {
  imageUri: null,
  caption: "赤いバラを持ってきた",
  postedAt: "06:32",
  topicLabel: "渋谷駅 ハチ公前",
};

function createEmptyCurrentParticipation(): CurrentParticipation {
  return {
    participation: null,
    topic: null,
    post: null,
    expiresAt: null,
    serverNow: new Date().toISOString(),
  };
}

function createMockCurrentParticipation(input: CheckInParticipationInput): CurrentParticipation {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 37 * 60 * 1000);
  return {
    participation: {
      id: 1,
      userId: 1,
      topicId: input.topicId,
      postId: 1,
      status: "active",
      checkedInAt: now.toISOString(),
      checkedOutAt: null,
    },
    topic: {
      id: input.topicId,
      startAt: now.toISOString(),
      endAt: expiresAt.toISOString(),
      locationName: "MOCK LOCATION",
      latitude: input.location.latitude,
      longitude: input.location.longitude,
      prompt: "MOCK TOPIC",
    },
    post: {
      id: 1,
      userId: 1,
      topicId: input.topicId,
      imageStorageKey: input.imageStorageKey,
      caption: input.caption,
      createdAt: now.toISOString(),
    },
    expiresAt: expiresAt.toISOString(),
    serverNow: now.toISOString(),
  };
}

export const mockDataSources: DataSources = {
  topics: {
    async getAll() {
      return buildMockTopics();
    },
  },
  participation: {
    async getCurrent() {
      return createEmptyCurrentParticipation();
    },
    async checkIn(input: CheckInParticipationInput) {
      return createMockCurrentParticipation(input);
    },
    async checkOut() {
      return createEmptyCurrentParticipation();
    },
  },
  posts: {
    async getAll() {
      return MOCK_POSTS;
    },
    async getMyPost() {
      return MOCK_MY_POST;
    },
  },
  follow: {
    async setFollowing(input: SetFollowingInput) {
      return {
        targetUserId: input.targetUserId,
        followState: input.following ? "following" : "none",
      };
    },
  },
  storage: {
    async createUploadUrl(input: CreateUploadUrlInput) {
      const extension = input.contentType === "image/png" ? "png" : "jpg";
      const now = new Date();
      return {
        imageStorageKey: `mock/users/1/posts/mock-upload.${extension}`,
        uploadUrl: "mock://storage/upload",
        expiresAt: new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
      };
    },
  },
};
