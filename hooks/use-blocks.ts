import {
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { dataSources } from "../lib/data";

export const BLOCKS_QUERY_KEY = ["blocks", "list"] as const;
export const BLOCK_MUTATION_KEY = ["blocks", "create"] as const;
export const UNBLOCK_MUTATION_KEY = ["blocks", "remove"] as const;
const POSTS_QUERY_KEY = ["posts", "current-topic"] as const;
const CHAT_LIST_QUERY_KEY = ["chat", "list"] as const;
const CHAT_MESSAGES_QUERY_KEY = ["chat", "messages"] as const;

type BlockActionInput = { targetUserId: string };
type MutationStateLike = {
  state: {
    variables?: unknown;
  };
};

export function getBlockInvalidationKeys() {
  return [
    BLOCKS_QUERY_KEY,
    POSTS_QUERY_KEY,
    CHAT_LIST_QUERY_KEY,
    CHAT_MESSAGES_QUERY_KEY,
  ] as const;
}

export function selectPendingBlockTargetUserId(
  mutation: MutationStateLike,
): string | undefined {
  const variables = mutation.state.variables;
  if (!variables || typeof variables !== "object") return undefined;
  const targetUserId = (variables as BlockActionInput).targetUserId;
  return typeof targetUserId === "string" ? targetUserId : undefined;
}

export function createPendingTargetCounts(
  targetUserIds: Array<string | undefined>,
): Map<string, number> {
  const counts = new Map<string, number>();
  targetUserIds.forEach((targetUserId) => {
    if (!targetUserId) return;
    counts.set(targetUserId, (counts.get(targetUserId) ?? 0) + 1);
  });
  return counts;
}

async function invalidateBlockQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  await Promise.all(
    getBlockInvalidationKeys().map((queryKey) =>
      queryClient.invalidateQueries({ queryKey }),
    ),
  );
}

export function useBlockedUsers(enabled = true) {
  const blocksQuery = useQuery({
    queryKey: BLOCKS_QUERY_KEY,
    queryFn: () => dataSources.blocks.list(),
    enabled,
  });

  return {
    blockedUsers: blocksQuery.data ?? [],
    refreshBlockedUsers: blocksQuery.refetch,
    isLoading: blocksQuery.isLoading,
    error: blocksQuery.error,
  };
}

export function useBlockActions() {
  const queryClient = useQueryClient();
  const blockPendingCounts = createPendingTargetCounts(
    useMutationState({
      filters: {
        mutationKey: BLOCK_MUTATION_KEY,
        status: "pending",
      },
      select: selectPendingBlockTargetUserId,
    }),
  );
  const unblockPendingCounts = createPendingTargetCounts(
    useMutationState({
      filters: {
        mutationKey: UNBLOCK_MUTATION_KEY,
        status: "pending",
      },
      select: selectPendingBlockTargetUserId,
    }),
  );
  const blockMutation = useMutation({
    mutationKey: BLOCK_MUTATION_KEY,
    mutationFn: (input: BlockActionInput) => dataSources.blocks.create(input),
    onSuccess: async () => {
      await invalidateBlockQueries(queryClient);
    },
  });
  const unblockMutation = useMutation({
    mutationKey: UNBLOCK_MUTATION_KEY,
    mutationFn: (input: BlockActionInput) => dataSources.blocks.remove(input),
    onSuccess: async () => {
      await invalidateBlockQueries(queryClient);
    },
  });

  return {
    blockUser: blockMutation.mutateAsync,
    unblockUser: unblockMutation.mutateAsync,
    isBlocking: blockPendingCounts.size > 0,
    isUnblocking: unblockPendingCounts.size > 0,
    isBlockPendingFor: (targetUserId: string) =>
      (blockPendingCounts.get(targetUserId) ?? 0) > 0,
    isUnblockPendingFor: (targetUserId: string) =>
      (unblockPendingCounts.get(targetUserId) ?? 0) > 0,
    blockError: blockMutation.error,
    unblockError: unblockMutation.error,
  };
}
