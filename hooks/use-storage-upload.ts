import { useMutation } from "@tanstack/react-query";

import {
  dataSources,
  type CreateUploadUrlInput,
  type DiscardUploadInput,
} from "@/lib/data";

export function useStorageUploadTarget() {
  const createUploadUrlMutation = useMutation({
    mutationFn: (input: CreateUploadUrlInput) => dataSources.storage.createUploadUrl(input),
  });
  const discardUploadMutation = useMutation({
    mutationFn: (input: DiscardUploadInput) => dataSources.storage.discardUpload(input),
  });

  return {
    createUploadUrl: createUploadUrlMutation.mutateAsync,
    isCreatingUploadUrl: createUploadUrlMutation.isPending,
    createUploadUrlError: createUploadUrlMutation.error,
    discardUpload: discardUploadMutation.mutateAsync,
    isDiscardingUpload: discardUploadMutation.isPending,
    discardUploadError: discardUploadMutation.error,
  };
}
