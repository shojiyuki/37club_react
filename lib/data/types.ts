import type { inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "@/server/routers";

type RouterOutputs = inferRouterOutputs<AppRouter>;

export type CurrentParticipation = RouterOutputs["participation"]["current"];

export interface DataSources {
  participation: {
    getCurrent(): Promise<CurrentParticipation>;
    checkOut(): Promise<CurrentParticipation>;
  };
}
