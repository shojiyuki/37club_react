import { apiTrpcClient } from "../trpc";

import type { CurrentParticipation, DataSources } from "./types";

type GetCurrentParticipation = () => Promise<CurrentParticipation>;

export function createServerDataSources(
  getCurrentParticipation: GetCurrentParticipation,
): DataSources {
  return {
    participation: {
      getCurrent: getCurrentParticipation,
    },
  };
}

export const serverDataSources = createServerDataSources(() =>
  apiTrpcClient.participation.current.query(),
);
