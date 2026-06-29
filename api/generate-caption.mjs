import { handleCaptionRequest } from "../server/caption.mjs";

export default async function handler(req, res) {
  await handleCaptionRequest(req, res);
}
