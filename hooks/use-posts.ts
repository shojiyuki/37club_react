import { useQuery } from "@tanstack/react-query";

import { dataSources } from "@/lib/data";

export const POSTS_QUERY_KEY = ["posts", "current-topic"] as const;

export function usePosts() {
  const postsQuery = useQuery({
    queryKey: POSTS_QUERY_KEY,
    queryFn: () => dataSources.posts.getAll(),
  });

  return {
    posts: postsQuery.data ?? [],
    refreshPosts: postsQuery.refetch,
    isRefreshing: postsQuery.isRefetching,
    isLoading: postsQuery.isLoading,
    error: postsQuery.error,
  };
}
