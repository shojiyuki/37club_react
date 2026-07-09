import { useMutation } from "@tanstack/react-query";

import { dataSources, type CreateUploadUrlInput } from "@/lib/data";

export function useStorageUploadTarget() {
  const createUploadUrlMutation = useMutation({
    mutationFn: (input: CreateUploadUrlInput) => dataSources.storage.createUploadUrl(input),
  });

  return {
    createUploadUrl: createUploadUrlMutation.mutateAsync,
    isCreatingUploadUrl: createUploadUrlMutation.isPending,
    createUploadUrlError: createUploadUrlMutation.error,
  };
}
