import React, {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";

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
  exitCommunity: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AppModeContext = createContext<AppModeContextValue>({
  mode: "lobby",
  isParticipant: false,
  isDemo: false,
  demoPostedAt: null,
  enterCommunity: () => {},
  exitCommunity: () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppModeProvider({ children }: { children: React.ReactNode }) {
  const [isParticipant, setIsParticipant] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [demoPostedAt, setDemoPostedAt] = useState<string | null>(null);

  const enterCommunity = useCallback((opts?: { isDemo?: boolean }) => {
    setIsParticipant(true);
    if (opts?.isDemo) {
      setIsDemo(true);
      setDemoPostedAt(new Date().toISOString());
    } else {
      setIsDemo(false);
      setDemoPostedAt(null);
    }
  }, []);

  const exitCommunity = useCallback(() => {
    setIsParticipant(false);
    setIsDemo(false);
    setDemoPostedAt(null);
  }, []);

  const mode: AppMode = isParticipant ? "community" : "lobby";

  return (
    <AppModeContext.Provider
      value={{ mode, isParticipant, isDemo, demoPostedAt, enterCommunity, exitCommunity }}
    >
      {children}
    </AppModeContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAppMode() {
  return useContext(AppModeContext);
}
