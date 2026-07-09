import { apiTrpcClient } from "../trpc";

import type {
  AppMyPost,
  AppPost,
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
type GetPosts = () => Promise<AppPost[]>;
type GetMyPost = () => Promise<AppMyPost>;

type ServerDataSourceDependencies = {
  getCurrentParticipation: GetCurrentParticipation;
  checkInParticipation: CheckInParticipation;
  checkOutParticipation: CheckOutParticipation;
  createUploadUrl: CreateUploadUrl;
  getPosts: GetPosts;
  getMyPost: GetMyPost;
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
    posts: {
      getAll: dependencies.getPosts,
      getMyPost: dependencies.getMyPost,
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
  getPosts: () => apiTrpcClient.posts.listCurrentTopic.query(),
  getMyPost: () => apiTrpcClient.posts.myCurrent.query(),
});
