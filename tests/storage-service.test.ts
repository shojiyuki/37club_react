import { describe, expect, it, vi } from "vitest";

import {
  MAX_UPLOAD_IMAGE_BYTES,
  StorageService,
  StorageServiceError,
  UPLOAD_URL_EXPIRES_IN_SECONDS,
} from "../server/services/storage-service";

import type { Storage } from "../server/storage/storage";

function createStorage(): Storage {
  return {
    createUploadUrl: vi.fn(async (input) => ({
      key: input.key,
      uploadUrl: `https://example.test/${input.key}`,
      expiresAt: new Date("2026-07-09T00:05:00.000Z"),
    })),
    createReadUrl: vi.fn(),
    getObjectMetadata: vi.fn(),
    deleteObject: vi.fn(),
  };
}

function createImageRepository(existingPost: unknown = undefined) {
  return {
    findPostByImageStorageKey: vi.fn(async () => existingPost as never),
  };
}

describe("StorageService", () => {
  it("creates a user-scoped jpg upload target", async () => {
    const storage = createStorage();
    const service = new StorageService(
      storage,
      () => new Date("2026-07-09T00:00:00.000Z"),
      () => "fixed-id",
    );

    await expect(
      service.createUploadTarget({
        userId: 123,
        contentType: "image/jpeg",
        contentLength: 1024,
      }),
    ).resolves.toEqual({
      imageStorageKey: "users/123/posts/fixed-id.jpg",
      uploadUrl: "https://example.test/users/123/posts/fixed-id.jpg",
      expiresAt: "2026-07-09T00:05:00.000Z",
    });
    expect(storage.createUploadUrl).toHaveBeenCalledWith({
      key: "users/123/posts/fixed-id.jpg",
      contentType: "image/jpeg",
      contentLength: 1024,
      expiresInSeconds: UPLOAD_URL_EXPIRES_IN_SECONDS,
    });
  });

  it("creates a png upload target", async () => {
    const storage = createStorage();
    const service = new StorageService(storage, undefined, () => "png-id");

    const result = await service.createUploadTarget({
      userId: 1,
      contentType: "image/png",
      contentLength: MAX_UPLOAD_IMAGE_BYTES,
    });

    expect(result.imageStorageKey).toBe("users/1/posts/png-id.png");
  });

  it("discards an unused user-scoped upload", async () => {
    const storage = createStorage();
    const imageRepository = createImageRepository();
    const service = new StorageService(storage, undefined, undefined, imageRepository);

    await expect(
      service.discardUpload({
        userId: 1,
        imageStorageKey: "users/1/posts/orphan.png",
      }),
    ).resolves.toEqual({ discarded: true });

    expect(imageRepository.findPostByImageStorageKey).toHaveBeenCalledWith("users/1/posts/orphan.png");
    expect(storage.deleteObject).toHaveBeenCalledWith("users/1/posts/orphan.png");
  });

  it("rejects discard when the upload key does not belong to the user", async () => {
    const storage = createStorage();
    const service = new StorageService(storage);

    await expect(
      service.discardUpload({
        userId: 1,
        imageStorageKey: "users/2/posts/photo.png",
      }),
    ).rejects.toMatchObject(new StorageServiceError("INVALID_IMAGE_KEY"));

    expect(storage.deleteObject).not.toHaveBeenCalled();
  });

  it("rejects discard when the image is already referenced by a post", async () => {
    const storage = createStorage();
    const service = new StorageService(
      storage,
      undefined,
      undefined,
      createImageRepository({ id: 10 }),
    );

    await expect(
      service.discardUpload({
        userId: 1,
        imageStorageKey: "users/1/posts/used.png",
      }),
    ).rejects.toMatchObject(new StorageServiceError("IMAGE_ALREADY_USED"));

    expect(storage.deleteObject).not.toHaveBeenCalled();
  });
});
