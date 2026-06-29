import { handleUploadImageRequest } from "../server/upload-image.mjs";

export default async function handler(req, res) {
  await handleUploadImageRequest(req, res);
}
