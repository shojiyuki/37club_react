import { useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";

import { dataSources } from "@/lib/data";

const REFRESH_THROTTLE_MS = 15 * 1000;

export const TOPICS_QUERY_KEY = ["topics", "list"] as const;

export function useTopics() {
  const topicsQuery = useQuery({
    queryKey: TOPICS_QUERY_KEY,
    queryFn: () => dataSources.topics.getAll(),
  });
  const lastRefreshAt = useRef<number>(Date.now());

  const refreshTopics = useCallback(
    (force = false) => {
      const now = Date.now();
      if (!force && now - lastRefreshAt.current < REFRESH_THROTTLE_MS) return;
      lastRefreshAt.current = now;
      void topicsQuery.refetch();
    },
    [topicsQuery],
  );

  return {
    topics: topicsQuery.data ?? [],
    refreshTopics,
    isLoading: topicsQuery.isLoading,
    error: topicsQuery.error,
  };
}
