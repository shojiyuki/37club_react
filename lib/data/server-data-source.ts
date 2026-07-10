import { apiTrpcClient } from "../trpc";

import type {
  AppChatListItem,
  AppChatMessage,
  AppChatMessages,
  AppMyPost,
  AppPost,
  AppTopic,
  ChatMessagesInput,
  CheckInParticipationInput,
  CreateUploadUrlInput,
  CreateUploadUrlResponse,
  CurrentParticipation,
  DataSources,
  SendChatMessageInput,
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
type GetChatList = () => Promise<AppChatListItem[]>;
type GetChatMessages = (input: ChatMessagesInput) => Promise<AppChatMessages>;
type SendChatMessage = (input: SendChatMessageInput) => Promise<AppChatMessage>;

type ServerDataSourceDependencies = {
  getTopics: GetTopics;
  getCurrentParticipation: GetCurrentParticipation;
  checkInParticipation: CheckInParticipation;
  checkOutParticipation: CheckOutParticipation;
  createUploadUrl: CreateUploadUrl;
  getPosts: GetPosts;
  getMyPost: GetMyPost;
  setFollowing: SetFollowing;
  getChatList: GetChatList;
  getChatMessages: GetChatMessages;
  sendChatMessage: SendChatMessage;
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
    chat: {
      list: dependencies.getChatList,
      messages: dependencies.getChatMessages,
      sendMessage: dependencies.sendChatMessage,
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
  getChatList: async () => {
    const result = await apiTrpcClient.chat.list.query();
    return result.map((item) => ({
      id: String(item.userId),
      name: item.userName,
      imageUri: item.imageUrl ?? undefined,
      lastMessage: item.lastMessage,
      hasUnread: item.hasUnread,
    }));
  },
  getChatMessages: async (input) => {
    const result = await apiTrpcClient.chat.messages.query({
      targetUserId: Number(input.targetUserId),
      limit: input.limit,
    });
    return {
      targetUser: {
        id: String(result.targetUser.id),
        name: result.targetUser.name,
      },
      messages: result.messages.map((message) => ({
        id: String(message.id),
        senderId: message.isMine ? "me" : String(message.senderUserId),
        text: message.body,
        createdAt: message.createdAt,
      })),
    };
  },
  sendChatMessage: async (input) => {
    const result = await apiTrpcClient.chat.sendMessage.mutate({
      targetUserId: Number(input.targetUserId),
      body: input.body,
    });
    return {
      id: String(result.message.id),
      senderId: result.message.isMine ? "me" : String(result.message.senderUserId),
      text: result.message.body,
      createdAt: result.message.createdAt,
    };
  },
});
