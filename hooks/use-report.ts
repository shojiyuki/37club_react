import { useMutation } from "@tanstack/react-query";

import { dataSources } from "../lib/data";
import type { CreateReportInput } from "../lib/data/types";

export function useReport() {
  const mutation = useMutation({
    mutationFn: (input: CreateReportInput) => dataSources.reports.create(input),
  });

  return {
    report: mutation.mutateAsync,
    isReporting: mutation.isPending,
    reportError: mutation.error,
  };
}
