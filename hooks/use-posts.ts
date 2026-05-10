import { useCallback, useState } from "react";

import { MOCK_POSTS, type MockPost } from "@/lib/mock-data";

export function usePosts() {
  const [posts, setPosts] = useState<MockPost[]>(MOCK_POSTS);

  const refreshPosts = useCallback(() => {
    setPosts(MOCK_POSTS);
  }, []);

  return {
    posts,
    refreshPosts,
    isLoading: false,
    error: null,
  };
}
