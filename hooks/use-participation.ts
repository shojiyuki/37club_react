import { useQuery } from "@tanstack/react-query";

import { dataSources } from "@/lib/data";

export function useParticipation() {
  const currentQuery = useQuery({
    queryKey: ["participation", "current"],
    queryFn: () => dataSources.participation.getCurrent(),
  });

  const refresh = async () => {
    await currentQuery.refetch();
  };

  return {
    current: currentQuery.data,
    isLoading: currentQuery.isLoading,
    error: currentQuery.error,
    refresh,
  };
}
