import { randomUUID } from "crypto";

import type { AllowedImageContentType, Storage } from "../storage/storage";

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
}
