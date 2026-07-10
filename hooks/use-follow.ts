import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { dataSources } from "@/lib/data";
import type { AppFollowState, AppPost } from "@/lib/data/types";
import { POSTS_QUERY_KEY } from "@/hooks/use-posts";

function applyFollowStateToPosts(
  posts: AppPost[] | undefined,
  userId: string,
  followState: AppFollowState,
): AppPost[] | undefined {
  return posts?.map((post) =>
    post.user.id === userId
      ? { ...post, user: { ...post.user, followState } }
      : post,
  );
}

export function useFollow(posts: AppPost[]) {
  const queryClient = useQueryClient();
  const [followStates, setFollowStates] = useState<Record<string, AppFollowState>>(() => {
    const init: Record<string, AppFollowState> = {};
    posts.forEach((post) => {
      init[post.user.id] = post.user.followState;
    });
    return init;
  });

  useEffect(() => {
    setFollowStates((prev) => {
      const next = { ...prev };
      let changed = false;
      posts.forEach((post) => {
        if (next[post.user.id] === undefined) {
          next[post.user.id] = post.user.followState;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [posts]);

  const updateFollowState = useCallback(
    async (userId: string, next: AppFollowState) => {
      const previous = followStates[userId] ?? "none";
      setFollowStates((prev) => ({ ...prev, [userId]: next }));
      queryClient.setQueryData<AppPost[]>(POSTS_QUERY_KEY, (current) =>
        applyFollowStateToPosts(current, userId, next),
      );
      try {
        const result = await dataSources.follow.setFollowing({
          targetUserId: userId,
          following: next === "following" || next === "mutual",
        });
        setFollowStates((prev) => ({ ...prev, [result.targetUserId]: result.followState }));
        queryClient.setQueryData<AppPost[]>(POSTS_QUERY_KEY, (current) =>
          applyFollowStateToPosts(current, result.targetUserId, result.followState),
        );
        return result.followState;
      } catch (error) {
        setFollowStates((prev) => ({ ...prev, [userId]: previous }));
        queryClient.setQueryData<AppPost[]>(POSTS_QUERY_KEY, (current) =>
          applyFollowStateToPosts(current, userId, previous),
        );
        throw error;
      }
    },
    [followStates, queryClient],
  );

  const getFollowState = useCallback(
    (post: AppPost) => followStates[post.user.id] ?? post.user.followState,
    [followStates]
  );

  const followingPosts = useMemo(
    () =>
      posts.filter((post) => {
        const state = followStates[post.user.id] ?? post.user.followState;
        return state === "following" || state === "mutual";
      }),
    [followStates, posts]
  );

  return {
    followingPosts,
    getFollowState,
    updateFollowState,
  };
}
