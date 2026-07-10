import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock AsyncStorage
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
  },
}));

// ─── Pure logic tests (no hooks) ─────────────────────────────────────────────
// We test the core logic of pinned topics management without React hooks.

describe("Pinned topics logic", () => {
  it("should toggle a topic ID into a set", () => {
    const prev = new Set<string>(["topic_1"]);

    // Toggle add
    const next1 = new Set(prev);
    const id = "topic_2";
    if (next1.has(id)) {
      next1.delete(id);
    } else {
      next1.add(id);
    }
    expect(next1.has("topic_2")).toBe(true);
    expect(next1.has("topic_1")).toBe(true);

    // Toggle remove
    const next2 = new Set(next1);
    if (next2.has(id)) {
      next2.delete(id);
    } else {
      next2.add(id);
    }
    expect(next2.has("topic_2")).toBe(false);
    expect(next2.has("topic_1")).toBe(true);
  });

  it("should filter pinned topics correctly", () => {
    const topics = [
      { id: "1", dateLabel: "Topic 1" },
      { id: "2", dateLabel: "Topic 2" },
      { id: "3", dateLabel: "Topic 3" },
    ];
    const pinnedIds = new Set(["1", "2"]);

    const pinned = topics.filter((t) => pinnedIds.has(t.id));
    expect(pinned).toHaveLength(2);
    expect(pinned.map((t) => t.id)).toEqual(["1", "2"]);
  });

  it("should return all topics when showPinnedOnly is false", () => {
    const topics = [
      { id: "1" },
      { id: "2" },
      { id: "3" },
    ];
    const pinnedIds = new Set(["1"]);
    const showPinnedOnly = false;

    const displayed = showPinnedOnly
      ? topics.filter((t) => pinnedIds.has(t.id))
      : topics;

    expect(displayed).toHaveLength(3);
  });

  it("should return empty array when PINNED mode and no pins", () => {
    const topics = [{ id: "1" }, { id: "2" }];
    const pinnedIds = new Set<string>();
    const showPinnedOnly = true;

    const displayed = showPinnedOnly
      ? topics.filter((t) => pinnedIds.has(t.id))
      : topics;

    expect(displayed).toHaveLength(0);
  });

  it("should cleanup stale pinned IDs not in valid list", () => {
    const pinnedIds = new Set(["topic_0", "topic_999", "topic_1"]);
    const validIds = ["topic_0", "topic_1", "topic_2"];
    const validSet = new Set(validIds);

    const stale = [...pinnedIds].filter((id) => !validSet.has(id));
    expect(stale).toEqual(["topic_999"]);

    const cleaned = new Set(pinnedIds);
    stale.forEach((id) => cleaned.delete(id));
    expect(cleaned.has("topic_999")).toBe(false);
    expect(cleaned.has("topic_0")).toBe(true);
    expect(cleaned.has("topic_1")).toBe(true);
  });

  it("should not crash when pinned IDs contain unknown topic IDs", () => {
    const topics = [{ id: "1" }, { id: "2" }];
    const pinnedIds = new Set(["1", "unknown_999", "also_unknown"]);

    // Filter should just ignore unknown IDs
    const pinned = topics.filter((t) => pinnedIds.has(t.id));
    expect(pinned).toHaveLength(1);
    expect(pinned[0].id).toBe("1");
  });

  it("should serialize and deserialize pinned IDs correctly", () => {
    const ids = ["topic_0", "topic_1", "topic_2"];
    const serialized = JSON.stringify(ids);
    const deserialized: string[] = JSON.parse(serialized);
    const restored = new Set(deserialized);

    expect(restored.has("topic_0")).toBe(true);
    expect(restored.has("topic_1")).toBe(true);
    expect(restored.size).toBe(3);
  });
});

describe("Refresh throttle logic", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("should skip refresh within 15 seconds", () => {
    const THROTTLE_MS = 15 * 1000;
    // Start lastRefreshAt far in the past so first call always passes
    let lastRefreshAt = Date.now() - THROTTLE_MS - 1;
    let refreshCount = 0;

    function doRefresh(force = false) {
      const now = Date.now();
      if (!force && now - lastRefreshAt < THROTTLE_MS) return;
      lastRefreshAt = now;
      refreshCount++;
    }

    doRefresh(); // first call (initial)
    expect(refreshCount).toBe(1);

    vi.advanceTimersByTime(5000); // 5 seconds later
    doRefresh();
    expect(refreshCount).toBe(1); // throttled

    vi.advanceTimersByTime(10001); // 15+ seconds later
    doRefresh();
    expect(refreshCount).toBe(2); // allowed
  });

  it("should always refresh when force=true", () => {
    const THROTTLE_MS = 15 * 1000;
    let lastRefreshAt = Date.now();
    let refreshCount = 0;

    function doRefresh(force = false) {
      const now = Date.now();
      if (!force && now - lastRefreshAt < THROTTLE_MS) return;
      lastRefreshAt = now;
      refreshCount++;
    }

    doRefresh(true);
    expect(refreshCount).toBe(1);

    vi.advanceTimersByTime(1000); // 1 second later
    doRefresh(true); // force
    expect(refreshCount).toBe(2); // not throttled
  });
});
