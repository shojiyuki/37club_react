import { useCallback, useEffect, useMemo, useState } from "react";

import {
  FOLLOWING_POST_IDS,
  type FollowState,
  type MockPost,
} from "@/lib/mock-data";

export function useFollow(posts: MockPost[]) {
  const [followStates, setFollowStates] = useState<Record<string, FollowState>>(() => {
    const init: Record<string, FollowState> = {};
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

  const updateFollowState = useCallback((userId: string, next: FollowState) => {
    setFollowStates((prev) => ({ ...prev, [userId]: next }));
  }, []);

  const getFollowState = useCallback(
    (post: MockPost) => followStates[post.user.id] ?? post.user.followState,
    [followStates]
  );

  const followingPosts = useMemo(
    () => posts.filter((post) => FOLLOWING_POST_IDS.has(post.id)),
    [posts]
  );

  return {
    followingPosts,
    getFollowState,
    updateFollowState,
  };
}
