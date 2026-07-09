import { apiTrpcClient } from "../trpc";

import type {
  CreateUploadUrlInput,
  CreateUploadUrlResponse,
  CurrentParticipation,
  DataSources,
} from "./types";

type GetCurrentParticipation = () => Promise<CurrentParticipation>;
type CheckOutParticipation = () => Promise<CurrentParticipation>;
type CreateUploadUrl = (input: CreateUploadUrlInput) => Promise<CreateUploadUrlResponse>;

type ServerDataSourceDependencies = {
  getCurrentParticipation: GetCurrentParticipation;
  checkOutParticipation: CheckOutParticipation;
  createUploadUrl: CreateUploadUrl;
};

export function createServerDataSources(
  dependencies: ServerDataSourceDependencies,
): DataSources {
  return {
    participation: {
      getCurrent: dependencies.getCurrentParticipation,
      checkOut: dependencies.checkOutParticipation,
    },
    storage: {
      createUploadUrl: dependencies.createUploadUrl,
    },
  };
}

export const serverDataSources = createServerDataSources({
  getCurrentParticipation: () => apiTrpcClient.participation.current.query(),
  checkOutParticipation: () => apiTrpcClient.participation.checkOut.mutate(),
  createUploadUrl: (input) => apiTrpcClient.storage.createUploadUrl.mutate(input),
});
