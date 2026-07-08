import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { dataSources } from "@/lib/data";

const CURRENT_PARTICIPATION_QUERY_KEY = ["participation", "current"] as const;

export function useParticipation() {
  const queryClient = useQueryClient();
  const currentQuery = useQuery({
    queryKey: CURRENT_PARTICIPATION_QUERY_KEY,
    queryFn: () => dataSources.participation.getCurrent(),
  });
  const checkOutMutation = useMutation({
    mutationFn: () => dataSources.participation.checkOut(),
    onSuccess: (current) => {
      queryClient.setQueryData(CURRENT_PARTICIPATION_QUERY_KEY, current);
    },
  });

  const refresh = async () => {
    await currentQuery.refetch();
  };

  return {
    current: currentQuery.data,
    isLoading: currentQuery.isLoading,
    error: currentQuery.error,
    refresh,
    checkOut: checkOutMutation.mutateAsync,
    isCheckingOut: checkOutMutation.isPending,
    checkOutError: checkOutMutation.error,
  };
}
