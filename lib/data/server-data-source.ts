import { apiTrpcClient } from "../trpc";

import type {
  CheckInParticipationInput,
  CreateUploadUrlInput,
  CreateUploadUrlResponse,
  CurrentParticipation,
  DataSources,
} from "./types";

type GetCurrentParticipation = () => Promise<CurrentParticipation>;
type CheckInParticipation = (input: CheckInParticipationInput) => Promise<CurrentParticipation>;
type CheckOutParticipation = () => Promise<CurrentParticipation>;
type CreateUploadUrl = (input: CreateUploadUrlInput) => Promise<CreateUploadUrlResponse>;

type ServerDataSourceDependencies = {
  getCurrentParticipation: GetCurrentParticipation;
  checkInParticipation: CheckInParticipation;
  checkOutParticipation: CheckOutParticipation;
  createUploadUrl: CreateUploadUrl;
};

export function createServerDataSources(
  dependencies: ServerDataSourceDependencies,
): DataSources {
  return {
    participation: {
      getCurrent: dependencies.getCurrentParticipation,
      checkIn: dependencies.checkInParticipation,
      checkOut: dependencies.checkOutParticipation,
    },
    storage: {
      createUploadUrl: dependencies.createUploadUrl,
    },
  };
}

export const serverDataSources = createServerDataSources({
  getCurrentParticipation: () => apiTrpcClient.participation.current.query(),
  checkInParticipation: (input) => apiTrpcClient.participation.checkIn.mutate(input),
  checkOutParticipation: () => apiTrpcClient.participation.checkOut.mutate(),
  createUploadUrl: (input) => apiTrpcClient.storage.createUploadUrl.mutate(input),
});
