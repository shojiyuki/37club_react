import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "@/server/routers";

type RouterInputs = inferRouterInputs<AppRouter>;
type RouterOutputs = inferRouterOutputs<AppRouter>;

export type CurrentParticipation = RouterOutputs["participation"]["current"];
export type CheckInParticipationInput = RouterInputs["participation"]["checkIn"];
export type CreateUploadUrlResponse = RouterOutputs["storage"]["createUploadUrl"];

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

export interface DataSources {
  participation: {
    getCurrent(): Promise<CurrentParticipation>;
    checkIn(input: CheckInParticipationInput): Promise<CurrentParticipation>;
    checkOut(): Promise<CurrentParticipation>;
  };
  posts: {
    getAll(): Promise<AppPost[]>;
    getMyPost(): Promise<AppMyPost>;
  };
  storage: {
    createUploadUrl(input: CreateUploadUrlInput): Promise<CreateUploadUrlResponse>;
  };
}
