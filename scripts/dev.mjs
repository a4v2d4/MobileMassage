import { createServer as createHttpServer } from "node:http";
import { loadEnv } from "vite";
import { createServer as createViteServer } from "vite";
import { handleCaptionRequest } from "../server/caption.mjs";

const root = process.cwd();
const env = loadEnv("development", root, "");
Object.assign(process.env, env);

const vite = await createViteServer({
  root,
  appType: "spa",
  server: {
    host: "127.0.0.1",
    hmr: {
      host: "127.0.0.1",
    },
    middlewareMode: true,
  },
});

const server = createHttpServer(async (req, res) => {
  if (req.url?.startsWith("/api/generate-caption")) {
    await handleCaptionRequest(req, res);
    return;
  }

  vite.middlewares(req, res, () => {
    res.statusCode = 404;
    res.end("Not found");
  });
});

const port = Number(process.env.PORT || 5173);

server.listen(port, "127.0.0.1", () => {
  console.log(`Sonoma Bodyworks publisher: http://localhost:${port}`);
});
