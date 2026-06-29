# Sonoma Bodyworks Instagram Publisher

A local React app for drafting Instagram captions and building a simple posting queue.

## Run locally

```bash
npm install
npm run dev
```

Open the URL printed in the terminal, usually `http://localhost:5173`.

## AI captions

The app runs without an API key and returns a local draft caption. For live OpenRouter captions, copy `.env.example` to `.env` and set:

```bash
OPENROUTER_API_KEY=your_api_key_here
OPENROUTER_MODEL=openai/gpt-4o-mini
```

Set `OPENROUTER_MODEL` to the OpenRouter model slug you want to use.

## Vercel backend

This app now uses Vercel serverless API routes:

- `POST /api/upload-image` stores uploaded images in Vercel Blob.
- `GET /api/posts` loads scheduled posts from Postgres.
- `POST /api/posts` saves a scheduled post.
- `DELETE /api/posts?id=...` removes a scheduled post.
- `POST /api/generate-caption` keeps the OpenRouter key on the server.

Before deploying, add these integrations/environment variables in Vercel:

```bash
BLOB_READ_WRITE_TOKEN=your_vercel_blob_read_write_token
DATABASE_URL=your_postgres_connection_string
OPENROUTER_API_KEY=your_openrouter_key
OPENROUTER_MODEL=openai/gpt-4o-mini
```

`OPENROUTER_API_KEY` is optional for deployment, but without it caption generation uses the built-in local fallback. The Postgres database can be Neon, Supabase, or any Vercel Marketplace Postgres provider that exposes a standard `DATABASE_URL`.
