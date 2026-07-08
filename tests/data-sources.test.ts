import { describe, expect, it, vi } from "vitest";

vi.mock("../lib/trpc", () => ({
  apiTrpcClient: {
    participation: {
      current: {
        query: vi.fn(),
      },
      checkOut: {
        mutate: vi.fn(),
      },
    },
  },
}));

import { mockDataSources } from "../lib/data/mock-data-source";
import { createServerDataSources } from "../lib/data/server-data-source";
import type { CurrentParticipation } from "../lib/data/types";

describe("participation data sources", () => {
  it("returns an empty current participation from the mock source", async () => {
    const result = await mockDataSources.participation.getCurrent();

    expect(result).toMatchObject({
      participation: null,
      topic: null,
      post: null,
      expiresAt: null,
    });
    expect(new Date(result.serverNow).toISOString()).toBe(result.serverNow);
  });

  it("delegates current participation retrieval to the server client", async () => {
    const current: CurrentParticipation = {
      participation: null,
      topic: null,
      post: null,
      expiresAt: null,
      serverNow: "2026-07-09T00:00:00.000Z",
    };
    const getCurrent = vi.fn().mockResolvedValue(current);
    const checkOut = vi.fn().mockResolvedValue(current);
    const sources = createServerDataSources({
      getCurrentParticipation: getCurrent,
      checkOutParticipation: checkOut,
    });

    await expect(sources.participation.getCurrent()).resolves.toBe(current);
    expect(getCurrent).toHaveBeenCalledOnce();
  });

  it("returns an empty current participation after mock checkout", async () => {
    const result = await mockDataSources.participation.checkOut();

    expect(result).toMatchObject({
      participation: null,
      topic: null,
      post: null,
      expiresAt: null,
    });
  });

  it("delegates checkout to the server client", async () => {
    const current: CurrentParticipation = {
      participation: null,
      topic: null,
      post: null,
      expiresAt: null,
      serverNow: "2026-07-09T00:00:00.000Z",
    };
    const getCurrent = vi.fn().mockResolvedValue(current);
    const checkOut = vi.fn().mockResolvedValue(current);
    const sources = createServerDataSources({
      getCurrentParticipation: getCurrent,
      checkOutParticipation: checkOut,
    });

    await expect(sources.participation.checkOut()).resolves.toBe(current);
    expect(checkOut).toHaveBeenCalledOnce();
  });
});
