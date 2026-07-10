import React, {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";
import { useAuth } from "@/hooks/use-auth";
import { useParticipation } from "@/hooks/use-participation";
import { getDataSource } from "@/lib/data-source";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AppMode = "lobby" | "community";

interface AppModeContextValue {
  /** Current mode derived from isParticipant */
  mode: AppMode;
  /** true when user has successfully posted and is inside the 37-min community */
  isParticipant: boolean;
  activeTopicStartAt: string | null;
  isParticipationLoading: boolean;
  participationError: Error | null;
  refreshParticipation: () => Promise<void>;
  /**
   * Call this AFTER a successful POST.
   * Sets isParticipant = true (community mode).
   */
  enterCommunity: () => void;
  /**
   * Call this when user confirms CHECK OUT.
   * Sets isParticipant = false (lobby mode).
   */
  exitCommunity: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AppModeContext = createContext<AppModeContextValue>({
  mode: "lobby",
  isParticipant: false,
  activeTopicStartAt: null,
  isParticipationLoading: false,
  participationError: null,
  refreshParticipation: async () => {},
  enterCommunity: () => {},
  exitCommunity: async () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppModeProvider({ children }: { children: React.ReactNode }) {
  const isServerDataSource = getDataSource() === "api";
  const { user, loading: isAuthLoading } = useAuth();
  const participation = useParticipation({
    enabled: !isServerDataSource || (!isAuthLoading && Boolean(user)),
  });
  const [localIsParticipant, setLocalIsParticipant] = useState(false);

  const enterCommunity = useCallback(() => {
    setLocalIsParticipant(true);
  }, []);

  const exitCommunity = useCallback(async () => {
    if (isServerDataSource) {
      await participation.checkOut();
    }

    setLocalIsParticipant(false);
  }, [isServerDataSource, participation.checkOut]);

  const serverIsParticipant = participation.current?.participation?.status === "active";
  const activeTopicStartAt =
    isServerDataSource && serverIsParticipant
      ? participation.current?.topic?.startAt ?? null
      : null;
  const isParticipant = isServerDataSource ? serverIsParticipant : localIsParticipant;
  const isParticipationLoading =
    isServerDataSource && (isAuthLoading || (Boolean(user) && participation.isLoading));
  const participationError = isServerDataSource ? participation.error : null;

  const mode: AppMode = isParticipant ? "community" : "lobby";

  return (
    <AppModeContext.Provider
      value={{
        mode,
        isParticipant,
        activeTopicStartAt,
        isParticipationLoading,
        participationError,
        refreshParticipation: participation.refresh,
        enterCommunity,
        exitCommunity,
      }}
    >
      {children}
    </AppModeContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAppMode() {
  return useContext(AppModeContext);
}
