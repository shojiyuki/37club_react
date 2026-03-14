import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "@37club_pinned_topic_ids";

/**
 * Manages pinned topic IDs with AsyncStorage persistence.
 *
 * - `pinnedIds`: Set of currently pinned topic IDs
 * - `toggle(id)`: Pin or unpin a topic
 * - `isPinned(id)`: Check if a topic is pinned
 * - `cleanup(validIds)`: Remove stale IDs that no longer exist in the topic list
 */
export function usePinnedTopics(validTopicIds?: string[]) {
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  // Load from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const ids: string[] = JSON.parse(raw);
          setPinnedIds(new Set(ids));
        }
      } catch {
        // ignore read errors
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // Persist to AsyncStorage whenever pinnedIds changes (after initial load)
  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...pinnedIds])).catch(() => {});
  }, [pinnedIds, loaded]);

  // Auto-cleanup: remove IDs that no longer exist in the valid topic list
  useEffect(() => {
    if (!loaded || !validTopicIds || validTopicIds.length === 0) return;
    const validSet = new Set(validTopicIds);
    const stale = [...pinnedIds].filter((id) => !validSet.has(id));
    if (stale.length > 0) {
      setPinnedIds((prev) => {
        const next = new Set(prev);
        stale.forEach((id) => next.delete(id));
        return next;
      });
    }
  }, [loaded, validTopicIds]);

  const toggle = useCallback((id: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const isPinned = useCallback(
    (id: string) => pinnedIds.has(id),
    [pinnedIds]
  );

  return { pinnedIds, toggle, isPinned, loaded };
}
