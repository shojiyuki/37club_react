import { randomUUID } from "crypto";

import type { AllowedImageContentType, Storage } from "../storage/storage";
import type { posts } from "../../drizzle/schema";

export const ALLOWED_IMAGE_CONTENT_TYPES = ["image/jpeg", "image/png"] as const;
export const MAX_UPLOAD_IMAGE_BYTES = 10 * 1024 * 1024;
export const UPLOAD_URL_EXPIRES_IN_SECONDS = 60 * 5;

export type CreateUploadTargetInput = {
  userId: number;
  contentType: AllowedImageContentType;
  contentLength: number;
};

export type CreateUploadTargetResponse = {
  imageStorageKey: string;
  uploadUrl: string;
  expiresAt: string;
};

export type DiscardUploadInput = {
  userId: number;
  imageStorageKey: string;
};

export type DiscardUploadResponse = {
  discarded: true;
};

export type StorageImageRepository = {
  findPostByImageStorageKey(imageStorageKey: string): Promise<typeof posts.$inferSelect | undefined>;
};

export type StorageServiceErrorCode = "INVALID_IMAGE_KEY" | "IMAGE_ALREADY_USED";

export class StorageServiceError extends Error {
  constructor(readonly code: StorageServiceErrorCode) {
    super(code);
  }
}

type Clock = () => Date;
type IdGenerator = () => string;

function extensionForContentType(contentType: AllowedImageContentType): string {
  switch (contentType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
  }
}

export class StorageService {
  constructor(
    private readonly storage: Storage,
    private readonly clock: Clock = () => new Date(),
    private readonly generateId: IdGenerator = randomUUID,
    private readonly imageRepository: StorageImageRepository | null = null,
  ) {}

  async createUploadTarget(input: CreateUploadTargetInput): Promise<CreateUploadTargetResponse> {
    const imageStorageKey = this.createImageStorageKey(input.userId, input.contentType);
    const target = await this.storage.createUploadUrl({
      key: imageStorageKey,
      contentType: input.contentType,
      contentLength: input.contentLength,
      expiresInSeconds: UPLOAD_URL_EXPIRES_IN_SECONDS,
    });

    return {
      imageStorageKey: target.key,
      uploadUrl: target.uploadUrl,
      expiresAt: target.expiresAt.toISOString(),
    };
  }

  private createImageStorageKey(userId: number, contentType: AllowedImageContentType): string {
    const extension = extensionForContentType(contentType);
    return `users/${userId}/posts/${this.generateId()}.${extension}`;
  }

  async discardUpload(input: DiscardUploadInput): Promise<DiscardUploadResponse> {
    if (!input.imageStorageKey.startsWith(`users/${input.userId}/posts/`)) {
      throw new StorageServiceError("INVALID_IMAGE_KEY");
    }

    const existingPost = await this.imageRepository?.findPostByImageStorageKey(input.imageStorageKey);
    if (existingPost) {
      throw new StorageServiceError("IMAGE_ALREADY_USED");
    }

    await this.storage.deleteObject(input.imageStorageKey);
    return { discarded: true };
  }
}
