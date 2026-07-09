import { describe, expect, it, vi } from "vitest";

import { loadUploadableImage, uploadImageToUrl } from "../lib/storage/upload-image";

describe("loadUploadableImage", () => {
  it("loads a uri as an uploadable png image", async () => {
    const blob = new Blob(["png"], { type: "image/png" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        blob: async () => blob,
      })),
    );

    await expect(loadUploadableImage("file:///tmp/photo.png")).resolves.toEqual({
      blob,
      contentType: "image/png",
      contentLength: 3,
    });
  });

  it("falls back to jpeg when the blob type is unavailable", async () => {
    const blob = new Blob(["jpg"]);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        blob: async () => blob,
      })),
    );

    await expect(loadUploadableImage("file:///tmp/photo.jpg")).resolves.toMatchObject({
      contentType: "image/jpeg",
      contentLength: 3,
    });
  });
});

describe("uploadImageToUrl", () => {
  it("skips network upload for mock URLs", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    await uploadImageToUrl({
      uploadUrl: "mock://storage/upload",
      image: {
        blob: new Blob(["mock"], { type: "image/jpeg" }),
        contentType: "image/jpeg",
        contentLength: 4,
      },
    });

    expect(fetch).not.toHaveBeenCalled();
  });

  it("puts the image blob to the presigned URL", async () => {
    const fetch = vi.fn(async () => ({ ok: true }));
    const blob = new Blob(["image"], { type: "image/jpeg" });
    vi.stubGlobal("fetch", fetch);

    await uploadImageToUrl({
      uploadUrl: "https://example.test/upload",
      image: {
        blob,
        contentType: "image/jpeg",
        contentLength: 5,
      },
    });

    expect(fetch).toHaveBeenCalledWith("https://example.test/upload", {
      method: "PUT",
      headers: {
        "Content-Type": "image/jpeg",
      },
      body: blob,
    });
  });
});
