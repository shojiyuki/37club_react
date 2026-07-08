import type { CurrentParticipation, DataSources } from "./types";

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
};
