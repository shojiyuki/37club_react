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
  /** true when the current session is a DEMO topic (5-min timer, no location check) */
  isDemo: boolean;
  /**
   * ISO string of when the user posted (used for DEMO 5-min countdown).
   * null if not in DEMO mode or not yet posted.
   */
  demoPostedAt: string | null;
  isParticipationLoading: boolean;
  participationError: Error | null;
  refreshParticipation: () => Promise<void>;
  /**
   * Call this AFTER a successful POST.
   * Sets isParticipant = true (community mode).
   * Pass isDemo=true for DEMO topic sessions.
   */
  enterCommunity: (opts?: { isDemo?: boolean }) => void;
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
  isDemo: false,
  demoPostedAt: null,
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
  const [isDemo, setIsDemo] = useState(false);
  const [demoPostedAt, setDemoPostedAt] = useState<string | null>(null);

  const enterCommunity = useCallback((opts?: { isDemo?: boolean }) => {
    setLocalIsParticipant(true);
    if (opts?.isDemo) {
      setIsDemo(true);
      setDemoPostedAt(new Date().toISOString());
    } else {
      setIsDemo(false);
      setDemoPostedAt(null);
    }
  }, []);

  const exitCommunity = useCallback(async () => {
    if (isServerDataSource && !isDemo) {
      await participation.checkOut();
    }

    setLocalIsParticipant(false);
    setIsDemo(false);
    setDemoPostedAt(null);
  }, [isDemo, isServerDataSource, participation.checkOut]);

  const serverIsParticipant = participation.current?.participation?.status === "active";
  const isParticipant = isDemo || (isServerDataSource ? serverIsParticipant : localIsParticipant);
  const isParticipationLoading =
    isServerDataSource && (isAuthLoading || (Boolean(user) && participation.isLoading));
  const participationError = isServerDataSource ? participation.error : null;

  const mode: AppMode = isParticipant ? "community" : "lobby";

  return (
    <AppModeContext.Provider
      value={{
        mode,
        isParticipant,
        isDemo,
        demoPostedAt,
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
