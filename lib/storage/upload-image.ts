export type UploadableImage = {
  blob: Blob;
  contentType: "image/jpeg" | "image/png";
  contentLength: number;
};

export type UploadImageToUrlInput = {
  uploadUrl: string;
  image: UploadableImage;
};

function isAllowedImageContentType(contentType: string): contentType is UploadableImage["contentType"] {
  return contentType === "image/jpeg" || contentType === "image/png";
}

function inferImageContentType(uri: string, blob: Blob): UploadableImage["contentType"] {
  if (isAllowedImageContentType(blob.type)) {
    return blob.type;
  }

  const lowerUri = uri.toLowerCase();
  if (lowerUri.includes(".png") || lowerUri.startsWith("data:image/png")) {
    return "image/png";
  }

  return "image/jpeg";
}

export async function loadUploadableImage(uri: string): Promise<UploadableImage> {
  if (!uri) {
    throw new Error("Image URI is required");
  }

  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error(`Failed to load image: ${response.status}`);
  }

  const blob = await response.blob();
  return {
    blob,
    contentType: inferImageContentType(uri, blob),
    contentLength: blob.size,
  };
}

export async function uploadImageToUrl(input: UploadImageToUrlInput): Promise<void> {
  if (input.uploadUrl.startsWith("mock://")) {
    return;
  }

  const response = await fetch(input.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": input.image.contentType,
    },
    body: input.image.blob,
  });

  if (!response.ok) {
    throw new Error(`Failed to upload image: ${response.status}`);
  }
}
