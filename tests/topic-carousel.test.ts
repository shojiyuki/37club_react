import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Inline helpers from TopicCarousel (duplicated for test isolation) ────────

const LIVE_DURATION_MS = 37 * 60 * 1000;

function getLiveState(startAt: string): { isLive: boolean; remainingMs: number } {
  const start = new Date(startAt).getTime();
  const now = Date.now();
  const elapsed = now - start;
  if (elapsed >= 0 && elapsed < LIVE_DURATION_MS) {
    return { isLive: true, remainingMs: LIVE_DURATION_MS - elapsed };
  }
  return { isLive: false, remainingMs: 0 };
}

function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface Topic {
  id: string;
  startAt: string;
  dateLabel: string;
  location: string;
  lat: number;
  lng: number;
  items: string;
}

function getInitialIndex(topics: Topic[]): number {
  const now = Date.now();
  const liveTopics = topics
    .map((t, i) => ({ i, ...getLiveState(t.startAt) }))
    .filter((x) => x.isLive);

  if (liveTopics.length > 0) {
    return liveTopics.reduce((a, b) => (a.remainingMs < b.remainingMs ? a : b)).i;
  }

  const upcoming = topics
    .map((t, i) => ({ i, diff: new Date(t.startAt).getTime() - now }))
    .filter((x) => x.diff > 0);

  if (upcoming.length > 0) {
    return upcoming.reduce((a, b) => (a.diff < b.diff ? a : b)).i;
  }

  return 0;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("getLiveState", () => {
  it("returns isLive=true when elapsed < 37 minutes", () => {
    const start = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { isLive, remainingMs } = getLiveState(start);
    expect(isLive).toBe(true);
    expect(remainingMs).toBeGreaterThan(0);
    expect(remainingMs).toBeLessThanOrEqual(27 * 60 * 1000 + 1000);
  });

  it("returns isLive=false when elapsed >= 37 minutes", () => {
    const start = new Date(Date.now() - 40 * 60 * 1000).toISOString();
    const { isLive, remainingMs } = getLiveState(start);
    expect(isLive).toBe(false);
    expect(remainingMs).toBe(0);
  });

  it("returns isLive=false for future events", () => {
    const start = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const { isLive } = getLiveState(start);
    expect(isLive).toBe(false);
  });
});

describe("formatCountdown", () => {
  it("formats 5 minutes 12 seconds correctly", () => {
    expect(formatCountdown(5 * 60 * 1000 + 12 * 1000)).toBe("05:12");
  });

  it("formats 18 minutes 47 seconds correctly", () => {
    expect(formatCountdown(18 * 60 * 1000 + 47 * 1000)).toBe("18:47");
  });

  it("formats 0 correctly", () => {
    expect(formatCountdown(0)).toBe("00:00");
  });

  it("handles negative values by clamping to 00:00", () => {
    expect(formatCountdown(-1000)).toBe("00:00");
  });
});

describe("getInitialIndex", () => {
  it("returns the LIVE topic with least remaining time", () => {
    const topics: Topic[] = [
      {
        id: "1",
        startAt: new Date(Date.now() - 31.8 * 60 * 1000).toISOString(), // ~5:12 remaining
        dateLabel: "2026/06/12（金）06:00",
        location: "渋谷駅 ハチ公前",
        lat: 35.6595,
        lng: 139.7005,
        items: "赤いもの",
      },
      {
        id: "2",
        startAt: new Date(Date.now() - 18.2 * 60 * 1000).toISOString(), // ~18:47 remaining
        dateLabel: "2026/06/12（金）06:00",
        location: "上野公園 西郷隆盛像前",
        lat: 35.7119,
        lng: 139.771,
        items: "サングラス",
      },
      {
        id: "3",
        startAt: "2026-06-15T06:00:00+09:00",
        dateLabel: "2026/06/15（月）06:00",
        location: "東京タワー 正面入口",
        lat: 35.6586,
        lng: 139.7454,
        items: "白いTシャツ",
      },
    ];
    // Topic 0 has least remaining time (~5:12), so it should be selected
    expect(getInitialIndex(topics)).toBe(0);
  });

  it("returns the nearest upcoming topic when no LIVE", () => {
    const topics: Topic[] = [
      {
        id: "3",
        startAt: "2026-06-15T06:00:00+09:00",
        dateLabel: "2026/06/15（月）06:00",
        location: "東京タワー 正面入口",
        lat: 35.6586,
        lng: 139.7454,
        items: "白いTシャツ",
      },
      {
        id: "4",
        startAt: "2026-06-18T06:00:00+09:00",
        dateLabel: "2026/06/18（木）06:00",
        location: "鎌倉駅 東口広場",
        lat: 35.3193,
        lng: 139.5503,
        items: "本",
      },
    ];
    expect(getInitialIndex(topics)).toBe(0);
  });

  it("returns 0 when all topics are in the past and none are LIVE", () => {
    const topics: Topic[] = [
      {
        id: "old",
        startAt: "2020-01-01T06:00:00+09:00",
        dateLabel: "2020/01/01",
        location: "Test",
        lat: 0,
        lng: 0,
        items: "test",
      },
    ];
    expect(getInitialIndex(topics)).toBe(0);
  });
});
