import { useCallback, useRef, useState } from "react";

import type { Topic } from "@/components/TopicCarousel";

const REFRESH_THROTTLE_MS = 15 * 1000;

function buildMockTopics(): Topic[] {
  function getLiveStartTime(minutesAgo: number): string {
    return new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();
  }

  return [
    {
      id: "demo",
      startAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      dateLabel: "DEMO — いつでも参加可能",
      location: "ANY LOCATION",
      lat: 35.6895,
      lng: 139.6917,
      items: "自由に撮影してみよう",
      isDemo: true,
    },
    {
      id: "1",
      startAt: getLiveStartTime(31.8),
      dateLabel: "2026/06/12（金）06:00",
      location: "渋谷駅 ハチ公前",
      lat: 35.6595,
      lng: 139.7005,
      items: "赤いもの",
    },
    {
      id: "2",
      startAt: getLiveStartTime(18.2),
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
    {
      id: "4",
      startAt: "2026-06-18T06:00:00+09:00",
      dateLabel: "2026/06/18（木）06:00",
      location: "鎌倉駅 東口広場",
      lat: 35.3193,
      lng: 139.5503,
      items: "本",
    },
    {
      id: "5",
      startAt: "2026-06-22T06:00:00+09:00",
      dateLabel: "2026/06/22（月）06:00",
      location: "大阪城公園 大手門前",
      lat: 34.6873,
      lng: 135.5262,
      items: "帽子",
    },
  ];
}

export function useTopics() {
  const [topics, setTopics] = useState<Topic[]>(() => buildMockTopics());
  const lastRefreshAt = useRef<number>(Date.now());

  const refreshTopics = useCallback((force = false) => {
    const now = Date.now();
    if (!force && now - lastRefreshAt.current < REFRESH_THROTTLE_MS) return;
    lastRefreshAt.current = now;
    setTopics(buildMockTopics());
  }, []);

  return {
    topics,
    refreshTopics,
    isLoading: false,
    error: null,
  };
}
