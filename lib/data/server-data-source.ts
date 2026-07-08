import { apiTrpcClient } from "../trpc";

import type { CurrentParticipation, DataSources } from "./types";

type GetCurrentParticipation = () => Promise<CurrentParticipation>;
type CheckOutParticipation = () => Promise<CurrentParticipation>;

type ServerDataSourceDependencies = {
  getCurrentParticipation: GetCurrentParticipation;
  checkOutParticipation: CheckOutParticipation;
};

export function createServerDataSources(
  dependencies: ServerDataSourceDependencies,
): DataSources {
  return {
    participation: {
      getCurrent: dependencies.getCurrentParticipation,
      checkOut: dependencies.checkOutParticipation,
    },
  };
}

export const serverDataSources = createServerDataSources({
  getCurrentParticipation: () => apiTrpcClient.participation.current.query(),
  checkOutParticipation: () => apiTrpcClient.participation.checkOut.mutate(),
});
