import { useCallback, useState } from "react";

type CreatePostInput = {
  imageUri: string;
  caption: string;
  startAt: string;
  remainingMs: number;
  isDemo: boolean;
};

type CreatedPost = CreatePostInput & {
  id: string;
  createdAt: string;
};

export function useCreatePost() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createPost = useCallback(async (input: CreatePostInput): Promise<CreatedPost> => {
    setIsLoading(true);
    setError(null);
    try {
      const createdPost: CreatedPost = {
        ...input,
        id: `local-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      return createdPost;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to create post");
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    createPost,
    isLoading,
    error,
  };
}
