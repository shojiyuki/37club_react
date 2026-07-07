import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@/drizzle/schema";
import { cognitoAuthClient } from "@/lib/auth/cognito-auth-client";
import { trpc } from "@/lib/trpc";

type UseAuthOptions = {
  autoFetch?: boolean;
};

function toError(error: unknown, fallbackMessage: string): Error {
  return error instanceof Error ? error : new Error(fallbackMessage);
}

export function useAuth(options?: UseAuthOptions) {
  const { autoFetch = true } = options ?? {};
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<Error | null>(null);
  const { refetch: refetchMe } = trpc.auth.me.useQuery(undefined, {
    enabled: false,
    retry: false,
  });

  const fetchUser = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const accessToken = await cognitoAuthClient.getValidAccessToken();
      if (!accessToken) {
        setUser(null);
        return null;
      }

      const result = await refetchMe();
      if (result.error) throw result.error;

      const authenticatedUser = result.data ?? null;
      setUser(authenticatedUser);
      return authenticatedUser;
    } catch (cause) {
      const authError = toError(cause, "Failed to fetch the authenticated user");
      setError(authError);
      setUser(null);
      throw authError;
    } finally {
      setLoading(false);
    }
  }, [refetchMe]);

  const signIn = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await cognitoAuthClient.signIn();
      await fetchUser();
    } catch (cause) {
      const authError = toError(cause, "Failed to sign in");
      setError(authError);
      throw authError;
    } finally {
      setLoading(false);
    }
  }, [fetchUser]);

  const logout = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await cognitoAuthClient.signOut();
    } catch (cause) {
      const authError = toError(cause, "Failed to sign out");
      setError(authError);
      throw authError;
    } finally {
      setUser(null);
      setLoading(false);
    }
  }, []);

  const isAuthenticated = useMemo(() => Boolean(user), [user]);

  useEffect(() => {
    if (!autoFetch) {
      setLoading(false);
      return;
    }

    void fetchUser().catch(() => {
      // The hook exposes the failure through error state.
    });
  }, [autoFetch, fetchUser]);

  return {
    user,
    loading,
    error,
    isAuthenticated,
    signIn,
    refresh: fetchUser,
    logout,
  };
}
