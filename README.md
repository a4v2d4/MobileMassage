# Sonoma Bodyworks Instagram Publisher

A local React app for drafting Instagram captions and building a simple posting queue.

## Run locally

```bash
npm install
npm run dev
```

Open the URL printed in the terminal, usually `http://localhost:5173`.

## AI captions

The app runs without an API key and returns a local draft caption. For live Anthropic captions, copy `.env.example` to `.env` and set:

```bash
ANTHROPIC_API_KEY=your_api_key_here
```

You can optionally set `ANTHROPIC_MODEL` in `.env`.
