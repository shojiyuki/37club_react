export type AllowedImageContentType = "image/jpeg" | "image/png";

export type CreateUploadUrlInput = {
  key: string;
  contentType: AllowedImageContentType;
  contentLength: number;
  expiresInSeconds: number;
};

export type UploadTarget = {
  key: string;
  uploadUrl: string;
  expiresAt: Date;
};

export type ObjectMetadata = {
  key: string;
  contentType: string | null;
  contentLength: number | null;
};

export interface Storage {
  createUploadUrl(input: CreateUploadUrlInput): Promise<UploadTarget>;
  createReadUrl(key: string): Promise<string>;
  getObjectMetadata(key: string): Promise<ObjectMetadata | null>;
  deleteObject(key: string): Promise<void>;
}
