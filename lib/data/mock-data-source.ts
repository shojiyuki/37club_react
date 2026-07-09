import type {
  AppMyPost,
  CheckInParticipationInput,
  CreateUploadUrlInput,
  CurrentParticipation,
  DataSources,
} from "./types";
import { MOCK_POSTS } from "../mock-data";

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
