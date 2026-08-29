import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { dataSources } from "../lib/data";
import type { AppPostComment } from "../lib/data/types";

export const postCommentsQueryKey = (postId?: string) =>
  ["post-comments", postId ?? ""] as const;

export function appendUniquePostComment(
  current: AppPostComment[] | undefined,
  created: AppPostComment,
): AppPostComment[] {
  if (current?.some((comment) => comment.id === created.id)) return current;
  return [...(current ?? []), created];
}

const PARTICIPATION_ACCESS_ERROR_MESSAGES = new Set([
  "NO_ACTIVE_PARTICIPATION",
  "POST_NOT_IN_ACTIVE_TOPIC",
  "PARTICIPATION_EXPIRED",
]);

export function isParticipationAccessError(error: unknown): boolean {
  return (
    error instanceof Error &&
    PARTICIPATION_ACCESS_ERROR_MESSAGES.has(error.message)
  );
}

export function usePostComments({
  postId,
  enabled,
}: {
  postId?: string;
  enabled: boolean;
}) {
  const queryClient = useQueryClient();
  const queryKey = postCommentsQueryKey(postId);
  const commentsQuery = useQuery({
    queryKey,
    queryFn: () => dataSources.postComments.list({ postId: postId ?? "" }),
    enabled: enabled && Boolean(postId),
  });
  const createMutation = useMutation({
    mutationFn: (body: string) =>
      dataSources.postComments.create({ postId: postId ?? "", body }),
    onSuccess: (created) => {
      queryClient.setQueryData<AppPostComment[]>(queryKey, (current) =>
        appendUniquePostComment(current, created),
      );
    },
  });

  return {
    comments: commentsQuery.data ?? [],
    previewComments: (commentsQuery.data ?? []).slice(-3),
    refreshComments: commentsQuery.refetch,
    sendComment: createMutation.mutateAsync,
    isLoading: commentsQuery.isLoading,
    isRefreshing: commentsQuery.isFetching && !commentsQuery.isLoading,
    isSending: createMutation.isPending,
    error: commentsQuery.error,
    sendError: createMutation.error,
  };
}
