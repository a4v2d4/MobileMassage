import { handlePostsRequest } from "../server/posts.mjs";

export default async function handler(req, res) {
  await handlePostsRequest(req, res);
}
