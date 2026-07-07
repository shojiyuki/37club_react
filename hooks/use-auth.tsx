import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@/drizzle/schema";
import { cognitoAuthClient } from "@/lib/auth/cognito-auth-client";
import { trpc } from "@/lib/trpc";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
  signIn(): Promise<void>;
  refresh(): Promise<User | null>;
  logout(): Promise<void>;
};

type AuthProviderProps = {
  children: ReactNode;
  autoFetch?: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function toError(error: unknown, fallbackMessage: string): Error {
  return error instanceof Error ? error : new Error(fallbackMessage);
}

export function AuthProvider({ children, autoFetch = true }: AuthProviderProps) {
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

  useEffect(() => {
    if (!autoFetch) {
      setLoading(false);
      return;
    }

    void fetchUser().catch(() => {
      // The provider exposes restoration failures through error state.
    });
  }, [autoFetch, fetchUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      error,
      isAuthenticated: Boolean(user),
      signIn,
      refresh: fetchUser,
      logout,
    }),
    [error, fetchUser, loading, logout, signIn, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
