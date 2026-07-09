import type { inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "@/server/routers";

type RouterOutputs = inferRouterOutputs<AppRouter>;

export type CurrentParticipation = RouterOutputs["participation"]["current"];
export type CreateUploadUrlResponse = RouterOutputs["storage"]["createUploadUrl"];

export type CreateUploadUrlInput = {
  contentType: "image/jpeg" | "image/png";
  contentLength: number;
};

export interface DataSources {
  participation: {
    getCurrent(): Promise<CurrentParticipation>;
    checkOut(): Promise<CurrentParticipation>;
  };
  storage: {
    createUploadUrl(input: CreateUploadUrlInput): Promise<CreateUploadUrlResponse>;
  };
}
