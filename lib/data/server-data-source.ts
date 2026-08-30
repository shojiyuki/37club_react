import { apiTrpcClient } from "../trpc";

import type {
  AppBlockedUser,
  AppChatListItem,
  AppChatMessage,
  AppChatMessages,
  AppMyPost,
  AppPost,
  AppReportResult,
  AppTopic,
  ChatMessagesInput,
  CheckInParticipationInput,
  CreateReportInput,
  CreateUploadUrlInput,
  CreateUploadUrlResponse,
  CurrentParticipation,
  DataSources,
  DiscardUploadInput,
  DiscardUploadResponse,
  SendChatMessageInput,
  SetFollowingInput,
  SetFollowingResponse,
} from "./types";

type GetCurrentParticipation = () => Promise<CurrentParticipation>;
type CheckInParticipation = (
  input: CheckInParticipationInput,
) => Promise<CurrentParticipation>;
type CheckOutParticipation = () => Promise<CurrentParticipation>;
type CreateUploadUrl = (
  input: CreateUploadUrlInput,
) => Promise<CreateUploadUrlResponse>;
type DiscardUpload = (
  input: DiscardUploadInput,
) => Promise<DiscardUploadResponse>;
type GetPosts = () => Promise<AppPost[]>;
type GetMyPost = () => Promise<AppMyPost>;
type GetTopics = () => Promise<AppTopic[]>;
type SetFollowing = (input: SetFollowingInput) => Promise<SetFollowingResponse>;
type GetChatList = () => Promise<AppChatListItem[]>;
type GetChatMessages = (input: ChatMessagesInput) => Promise<AppChatMessages>;
type SendChatMessage = (input: SendChatMessageInput) => Promise<AppChatMessage>;
type CreateReport = (input: {
  targetType: CreateReportInput["targetType"];
  targetId: number;
  reason: CreateReportInput["reason"];
  details?: string;
}) => Promise<{
  id: number;
  targetType: CreateReportInput["targetType"];
  targetId: number;
  status: AppReportResult["status"];
  createdAt: string;
}>;
type ListBlocks = () => Promise<
  Array<{ userId: number; name: string; blockedAt: string }>
>;
type CreateBlock = (input: {
  targetUserId: number;
}) => Promise<{ userId: number; name: string; blockedAt: string }>;
type RemoveBlock = (input: {
  targetUserId: number;
}) => Promise<{ targetUserId: number; removed: true }>;
type ServerDataSourceDependencies = {
  getTopics: GetTopics;
  getCurrentParticipation: GetCurrentParticipation;
  checkInParticipation: CheckInParticipation;
  checkOutParticipation: CheckOutParticipation;
  createUploadUrl: CreateUploadUrl;
  discardUpload?: DiscardUpload;
  getPosts: GetPosts;
  getMyPost: GetMyPost;
  setFollowing: SetFollowing;
  getChatList: GetChatList;
  getChatMessages: GetChatMessages;
  sendChatMessage: SendChatMessage;
  createReport: CreateReport;
  listBlocks: ListBlocks;
  createBlock: CreateBlock;
  removeBlock: RemoveBlock;
};

function parseCanonicalPositiveInteger(
  value: string,
  errorMessage: "INVALID_TARGET_ID" | "INVALID_TARGET_USER_ID",
): number {
  if (!/^[1-9]\d*$/.test(value)) {
    throw new Error(errorMessage);
  }
  const parsed = Number(value);
  if (
    !Number.isSafeInteger(parsed) ||
    parsed <= 0 ||
    !Number.isFinite(parsed) ||
    String(parsed) !== value
  ) {
    throw new Error(errorMessage);
  }
  return parsed;
}

function toAppReportResult(
  result: Awaited<ReturnType<CreateReport>>,
): AppReportResult {
  return {
    id: String(result.id),
    targetType: result.targetType,
    targetId: String(result.targetId),
    status: result.status,
    createdAt: result.createdAt,
  };
}

function toAppBlockedUser(
  user:
    | Awaited<ReturnType<ListBlocks>>[number]
    | Awaited<ReturnType<CreateBlock>>,
): AppBlockedUser {
  return {
    userId: String(user.userId),
    name: user.name,
    blockedAt: user.blockedAt,
  };
}

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
    reports: {
      create: async (input) => {
        const result = await dependencies.createReport({
          targetType: input.targetType,
          targetId: parseCanonicalPositiveInteger(
            input.targetId,
            "INVALID_TARGET_ID",
          ),
          reason: input.reason,
          details: input.details,
        });
        return toAppReportResult(result);
      },
    },
    blocks: {
      list: async () => {
        const result = await dependencies.listBlocks();
        return result.map(toAppBlockedUser);
      },
      create: async (input) => {
        const result = await dependencies.createBlock({
          targetUserId: parseCanonicalPositiveInteger(
            input.targetUserId,
            "INVALID_TARGET_USER_ID",
          ),
        });
        return toAppBlockedUser(result);
      },
      remove: async (input) => {
        const result = await dependencies.removeBlock({
          targetUserId: parseCanonicalPositiveInteger(
            input.targetUserId,
            "INVALID_TARGET_USER_ID",
          ),
        });
        return {
          targetUserId: String(result.targetUserId),
          removed: true,
        };
      },
    },
    chat: {
      list: dependencies.getChatList,
      messages: dependencies.getChatMessages,
      sendMessage: dependencies.sendChatMessage,
    },
    storage: {
      createUploadUrl: dependencies.createUploadUrl,
      discardUpload:
        dependencies.discardUpload ?? (async () => ({ discarded: true })),
    },
  };
}

export const serverDataSources = createServerDataSources({
  getTopics: () => apiTrpcClient.topics.list.query(),
  getCurrentParticipation: () => apiTrpcClient.participation.current.query(),
  checkInParticipation: (input) =>
    apiTrpcClient.participation.checkIn.mutate(input),
  checkOutParticipation: () => apiTrpcClient.participation.checkOut.mutate(),
  createUploadUrl: (input) =>
    apiTrpcClient.storage.createUploadUrl.mutate(input),
  discardUpload: (input) => apiTrpcClient.storage.discardUpload.mutate(input),
  getPosts: () => apiTrpcClient.posts.listCurrentTopic.query(),
  getMyPost: () => apiTrpcClient.posts.myCurrent.query(),
  createReport: (input) => apiTrpcClient.reports.create.mutate(input),
  listBlocks: () => apiTrpcClient.blocks.list.query(),
  createBlock: (input) => apiTrpcClient.blocks.create.mutate(input),
  removeBlock: (input) => apiTrpcClient.blocks.remove.mutate(input),
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
      senderId: result.message.isMine
        ? "me"
        : String(result.message.senderUserId),
      text: result.message.body,
      createdAt: result.message.createdAt,
    };
  },
});
