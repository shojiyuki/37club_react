import { describe, expect, it, vi } from "vitest";

vi.mock("../lib/trpc", () => ({
  apiTrpcClient: {
    participation: {
      current: {
        query: vi.fn(),
      },
      checkIn: {
        mutate: vi.fn(),
      },
      checkOut: {
        mutate: vi.fn(),
      },
    },
    storage: {
      createUploadUrl: {
        mutate: vi.fn(),
      },
    },
  },
}));

import { mockDataSources } from "../lib/data/mock-data-source";
import { createServerDataSources } from "../lib/data/server-data-source";
import type {
  CheckInParticipationInput,
  CreateUploadUrlResponse,
  CurrentParticipation,
} from "../lib/data/types";

function createCurrentParticipation(): CurrentParticipation {
  return {
    participation: null,
    topic: null,
    post: null,
    expiresAt: null,
    serverNow: "2026-07-09T00:00:00.000Z",
  };
}

describe("participation data sources", () => {
  const checkInInput: CheckInParticipationInput = {
    topicId: 1,
    imageStorageKey: "users/1/posts/test.png",
    caption: "赤いもの",
    location: {
      latitude: 35.6595,
      longitude: 139.7005,
      accuracy: 20,
    },
  };

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
    const current = createCurrentParticipation();
    const getCurrent = vi.fn().mockResolvedValue(current);
    const checkOut = vi.fn().mockResolvedValue(current);
    const sources = createServerDataSources({
      getCurrentParticipation: getCurrent,
      checkInParticipation: vi.fn().mockResolvedValue(current),
      checkOutParticipation: checkOut,
      createUploadUrl: vi.fn(),
    });

    await expect(sources.participation.getCurrent()).resolves.toBe(current);
    expect(getCurrent).toHaveBeenCalledOnce();
  });

  it("returns an active current participation after mock check-in", async () => {
    const result = await mockDataSources.participation.checkIn(checkInInput);

    expect(result).toMatchObject({
      participation: {
        userId: 1,
        topicId: checkInInput.topicId,
        status: "active",
      },
      topic: {
        id: checkInInput.topicId,
        latitude: checkInInput.location.latitude,
        longitude: checkInInput.location.longitude,
      },
      post: {
        imageStorageKey: checkInInput.imageStorageKey,
        caption: checkInInput.caption,
      },
    });
    expect(new Date(result.serverNow).toISOString()).toBe(result.serverNow);
    expect(new Date(result.expiresAt ?? "").toISOString()).toBe(result.expiresAt);
  });

  it("delegates check-in to the server client", async () => {
    const current = createCurrentParticipation();
    const checkIn = vi.fn().mockResolvedValue(current);
    const sources = createServerDataSources({
      getCurrentParticipation: vi.fn().mockResolvedValue(current),
      checkInParticipation: checkIn,
      checkOutParticipation: vi.fn().mockResolvedValue(current),
      createUploadUrl: vi.fn(),
    });

    await expect(sources.participation.checkIn(checkInInput)).resolves.toBe(current);
    expect(checkIn).toHaveBeenCalledWith(checkInInput);
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
    const current = createCurrentParticipation();
    const getCurrent = vi.fn().mockResolvedValue(current);
    const checkOut = vi.fn().mockResolvedValue(current);
    const sources = createServerDataSources({
      getCurrentParticipation: getCurrent,
      checkInParticipation: vi.fn().mockResolvedValue(current),
      checkOutParticipation: checkOut,
      createUploadUrl: vi.fn(),
    });

    await expect(sources.participation.checkOut()).resolves.toBe(current);
    expect(checkOut).toHaveBeenCalledOnce();
  });

  it("returns a mock upload URL target", async () => {
    const result = await mockDataSources.storage.createUploadUrl({
      contentType: "image/png",
      contentLength: 70,
    });

    expect(result).toMatchObject({
      imageStorageKey: "mock/users/1/posts/mock-upload.png",
      uploadUrl: "mock://storage/upload",
    });
    expect(new Date(result.expiresAt).toISOString()).toBe(result.expiresAt);
  });

  it("delegates upload URL creation to the server client", async () => {
    const uploadTarget: CreateUploadUrlResponse = {
      imageStorageKey: "users/1/posts/test.jpg",
      uploadUrl: "https://example.test/upload",
      expiresAt: "2026-07-09T00:05:00.000Z",
    };
    const current = createCurrentParticipation();
    const createUploadUrl = vi.fn().mockResolvedValue(uploadTarget);
    const sources = createServerDataSources({
      getCurrentParticipation: vi.fn().mockResolvedValue(current),
      checkInParticipation: vi.fn().mockResolvedValue(current),
      checkOutParticipation: vi.fn().mockResolvedValue(current),
      createUploadUrl,
    });
    const input = {
      contentType: "image/jpeg" as const,
      contentLength: 1024,
    };

    await expect(sources.storage.createUploadUrl(input)).resolves.toBe(uploadTarget);
    expect(createUploadUrl).toHaveBeenCalledWith(input);
  });
});
