import { put } from "@vercel/blob";
import { readJson, sendJson } from "./http.mjs";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function cleanFileName(fileName) {
  return String(fileName || "post-image.jpg")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "post-image.jpg";
}

export async function handleUploadImageRequest(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const { image, mediaType, fileName } = await readJson(req);

    if (!image || typeof image !== "string") {
      sendJson(res, 400, { error: "Missing image data." });
      return;
    }

    if (!mediaType || !String(mediaType).startsWith("image/")) {
      sendJson(res, 400, { error: "Only image uploads are supported." });
      return;
    }

    const buffer = Buffer.from(image, "base64");
    if (buffer.length > MAX_IMAGE_BYTES) {
      sendJson(res, 413, { error: "Images must be smaller than 8 MB." });
      return;
    }

    const blob = await put(
      `scheduled-posts/${Date.now()}-${cleanFileName(fileName)}`,
      buffer,
      {
        access: "public",
        contentType: mediaType,
      },
    );

    sendJson(res, 200, {
      url: blob.url,
      pathname: blob.pathname,
    });
  } catch (error) {
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : "Could not upload image.",
    });
  }
}
