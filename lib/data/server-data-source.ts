import { apiTrpcClient } from "../trpc";

import type {
  AppMyPost,
  AppPost,
  AppTopic,
  CheckInParticipationInput,
  CreateUploadUrlInput,
  CreateUploadUrlResponse,
  CurrentParticipation,
  DataSources,
  SetFollowingInput,
  SetFollowingResponse,
} from "./types";

type GetCurrentParticipation = () => Promise<CurrentParticipation>;
type CheckInParticipation = (input: CheckInParticipationInput) => Promise<CurrentParticipation>;
type CheckOutParticipation = () => Promise<CurrentParticipation>;
type CreateUploadUrl = (input: CreateUploadUrlInput) => Promise<CreateUploadUrlResponse>;
type GetPosts = () => Promise<AppPost[]>;
type GetMyPost = () => Promise<AppMyPost>;
type GetTopics = () => Promise<AppTopic[]>;
type SetFollowing = (input: SetFollowingInput) => Promise<SetFollowingResponse>;

type ServerDataSourceDependencies = {
  getTopics: GetTopics;
  getCurrentParticipation: GetCurrentParticipation;
  checkInParticipation: CheckInParticipation;
  checkOutParticipation: CheckOutParticipation;
  createUploadUrl: CreateUploadUrl;
  getPosts: GetPosts;
  getMyPost: GetMyPost;
  setFollowing: SetFollowing;
};

export function createServerDataSources(
  dependencies: ServerDataSourceDependencies,
): DataSources {
  return {
    topics: {
      getAll: dependencies.getTopics,
    },
    participation: {
      getCurrent: dependencies.getCurrentParticipation,
      checkIn: dependencies.checkInParticipation,
      checkOut: dependencies.checkOutParticipation,
    },
    posts: {
      getAll: dependencies.getPosts,
      getMyPost: dependencies.getMyPost,
    },
    follow: {
      setFollowing: dependencies.setFollowing,
    },
    storage: {
      createUploadUrl: dependencies.createUploadUrl,
    },
  };
}

export const serverDataSources = createServerDataSources({
  getTopics: () => apiTrpcClient.topics.list.query(),
  getCurrentParticipation: () => apiTrpcClient.participation.current.query(),
  checkInParticipation: (input) => apiTrpcClient.participation.checkIn.mutate(input),
  checkOutParticipation: () => apiTrpcClient.participation.checkOut.mutate(),
  createUploadUrl: (input) => apiTrpcClient.storage.createUploadUrl.mutate(input),
  getPosts: () => apiTrpcClient.posts.listCurrentTopic.query(),
  getMyPost: () => apiTrpcClient.posts.myCurrent.query(),
  setFollowing: async (input) => {
    const result = await apiTrpcClient.follow.setFollowing.mutate({
      targetUserId: Number(input.targetUserId),
      following: input.following,
    });
    return {
      targetUserId: String(result.targetUserId),
      followState: result.followState,
    };
  },
});
