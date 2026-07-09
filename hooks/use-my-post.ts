import { useQuery } from "@tanstack/react-query";

import { dataSources } from "@/lib/data";

export type MyPost = {
  imageUri: string | null;
  caption: string;
  postedAt: string;
  topicLabel: string;
};

const EMPTY_MY_POST: MyPost = {
  imageUri: null,
  caption: "",
  postedAt: "",
  topicLabel: "",
};

const MY_POST_QUERY_KEY = ["posts", "my-current"] as const;

function formatPostedAt(postedAt: string): string {
  if (!postedAt) {
    return "";
  }
  const date = new Date(postedAt);

  if (Number.isNaN(date.getTime())) {
    return postedAt;
  }

  return date.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function useMyPost() {
  const myPostQuery = useQuery({
    queryKey: MY_POST_QUERY_KEY,
    queryFn: () => dataSources.posts.getMyPost(),
  });
  const rawMyPost = myPostQuery.data ?? EMPTY_MY_POST;

  return {
    myPost: {
      ...rawMyPost,
      postedAt: formatPostedAt(rawMyPost.postedAt),
    },
    isLoading: myPostQuery.isLoading,
    error: myPostQuery.error,
  };
}
