import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "@/server/routers";

type RouterInputs = inferRouterInputs<AppRouter>;
type RouterOutputs = inferRouterOutputs<AppRouter>;

export type CurrentParticipation = RouterOutputs["participation"]["current"];
export type CheckInParticipationInput = RouterInputs["participation"]["checkIn"];
export type CreateUploadUrlResponse = RouterOutputs["storage"]["createUploadUrl"];
export type SetFollowingInput = {
  targetUserId: string;
  following: boolean;
};
export type SetFollowingResponse = {
  targetUserId: string;
  followState: AppFollowState;
};

export type AppChatListItem = {
  id: string;
  name: string;
  imageUri?: string;
  lastMessage: string;
  hasUnread: boolean;
};

export type AppChatMessage = {
  id: string;
  senderId: string;
  text: string;
  createdAt?: string;
};

export type AppChatMessages = {
  targetUser: {
    id: string;
    name: string;
  };
  messages: AppChatMessage[];
};

export type ChatMessagesInput = {
  targetUserId: string;
  limit?: number;
};

export type SendChatMessageInput = {
  targetUserId: string;
  body: string;
};

export type CreateUploadUrlInput = {
  contentType: "image/jpeg" | "image/png";
  contentLength: number;
};

export type AppFollowState = "none" | "following" | "mutual";

export type AppPost = {
  id: string;
  user: {
    id: string;
    name: string;
    followState: AppFollowState;
    isMine?: boolean;
  };
  imageUri: string;
  caption: string;
  topicId: string;
};

export type AppMyPost = {
  imageUri: string | null;
  caption: string;
  postedAt: string;
  topicLabel: string;
};

export type AppTopic = {
  id: string;
  startAt: string;
  dateLabel: string;
  location: string;
  lat: number;
  lng: number;
  items: string;
};

export interface DataSources {
  topics: {
    getAll(): Promise<AppTopic[]>;
  };
  participation: {
    getCurrent(): Promise<CurrentParticipation>;
    checkIn(input: CheckInParticipationInput): Promise<CurrentParticipation>;
    checkOut(): Promise<CurrentParticipation>;
  };
  posts: {
    getAll(): Promise<AppPost[]>;
    getMyPost(): Promise<AppMyPost>;
  };
  follow: {
    setFollowing(input: SetFollowingInput): Promise<SetFollowingResponse>;
  };
  chat: {
    list(): Promise<AppChatListItem[]>;
    messages(input: ChatMessagesInput): Promise<AppChatMessages>;
    sendMessage(input: SendChatMessageInput): Promise<AppChatMessage>;
  };
  storage: {
    createUploadUrl(input: CreateUploadUrlInput): Promise<CreateUploadUrlResponse>;
  };
}
