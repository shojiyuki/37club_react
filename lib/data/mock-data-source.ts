import type { CreateUploadUrlInput, CurrentParticipation, DataSources } from "./types";

function createEmptyCurrentParticipation(): CurrentParticipation {
  return {
    participation: null,
    topic: null,
    post: null,
    expiresAt: null,
    serverNow: new Date().toISOString(),
  };
}

export const mockDataSources: DataSources = {
  participation: {
    async getCurrent() {
      return createEmptyCurrentParticipation();
    },
    async checkOut() {
      return createEmptyCurrentParticipation();
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
