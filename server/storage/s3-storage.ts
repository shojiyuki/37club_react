import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  type HeadObjectCommandOutput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { ENV } from "../_core/env";

import type { CreateUploadUrlInput, ObjectMetadata, Storage, UploadTarget } from "./storage";

function requireS3Config() {
  if (!ENV.awsRegion) {
    throw new Error("AWS_REGION is not configured");
  }
  if (!ENV.s3Bucket) {
    throw new Error("S3_BUCKET is not configured");
  }

  return {
    region: ENV.awsRegion,
    bucket: ENV.s3Bucket,
  };
}

function toObjectMetadata(key: string, output: HeadObjectCommandOutput): ObjectMetadata {
  return {
    key,
    contentType: output.ContentType ?? null,
    contentLength: output.ContentLength ?? null,
  };
}

export class S3Storage implements Storage {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(client?: S3Client) {
    const config = requireS3Config();
    this.bucket = config.bucket;
    this.client = client ?? new S3Client({ region: config.region });
  }

  async createUploadUrl(input: CreateUploadUrlInput): Promise<UploadTarget> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: input.key,
      ContentType: input.contentType,
      ContentLength: input.contentLength,
    });
    const uploadUrl = await getSignedUrl(this.client, command, {
      expiresIn: input.expiresInSeconds,
    });

    return {
      key: input.key,
      uploadUrl,
      expiresAt: new Date(Date.now() + input.expiresInSeconds * 1000),
    };
  }

  async createReadUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.client, command, { expiresIn: 60 * 5 });
  }

  async getObjectMetadata(key: string): Promise<ObjectMetadata | null> {
    try {
      const output = await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      return toObjectMetadata(key, output);
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "name" in error &&
        (error.name === "NotFound" || error.name === "NoSuchKey")
      ) {
        return null;
      }
      throw error;
    }
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }
}
