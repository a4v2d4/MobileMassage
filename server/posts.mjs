import { neon } from "@neondatabase/serverless";
import { getRequestUrl, readJson, sendJson } from "./http.mjs";

let sql;
let tableReady;

function connectionString() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;
}

function getSql() {
  const url = connectionString();
  if (!url) {
    throw new Error("Set DATABASE_URL or POSTGRES_URL to store scheduled posts.");
  }

  sql ||= neon(url);
  return sql;
}

async function ensureTable() {
  tableReady ||= getSql()`CREATE TABLE IF NOT EXISTS scheduled_posts (
    id text PRIMARY KEY,
    image_url text NOT NULL,
    image_pathname text,
    caption text NOT NULL,
    scheduled_date date NOT NULL,
    scheduled_time text NOT NULL,
    scheduled_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`;

  await tableReady;
}

function toPost(row) {
  const date = row.scheduled_date instanceof Date
    ? row.scheduled_date.toISOString().slice(0, 10)
    : String(row.scheduled_date).slice(0, 10);

  return {
    id: row.id,
    photo: row.image_url,
    imageUrl: row.image_url,
    imagePathname: row.image_pathname,
    caption: row.caption,
    date,
    time: row.scheduled_time,
    scheduledAt: row.scheduled_at,
  };
}

function isDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isTime(value) {
  return typeof value === "string" && /^\d{2}:\d{2}$/.test(value);
}

export async function handlePostsRequest(req, res) {
  try {
    await ensureTable();

    if (req.method === "GET") {
      const rows = await getSql()`SELECT * FROM scheduled_posts ORDER BY scheduled_at ASC`;
      sendJson(res, 200, { posts: rows.map(toPost) });
      return;
    }

    if (req.method === "POST") {
      const { imageUrl, imagePathname, caption, date, time, scheduledAt } = await readJson(req);

      if (!imageUrl || typeof imageUrl !== "string") {
        sendJson(res, 400, { error: "Missing uploaded image URL." });
        return;
      }

      if (!caption || typeof caption !== "string") {
        sendJson(res, 400, { error: "Missing caption." });
        return;
      }

      if (!isDate(date) || !isTime(time)) {
        sendJson(res, 400, { error: "Missing scheduled date or time." });
        return;
      }

      const timestamp = scheduledAt ? new Date(scheduledAt) : new Date(`${date}T${time}`);
      if (Number.isNaN(timestamp.getTime())) {
        sendJson(res, 400, { error: "Invalid scheduled time." });
        return;
      }

      const id = crypto.randomUUID();
      const rows = await getSql()`INSERT INTO scheduled_posts
        (id, image_url, image_pathname, caption, scheduled_date, scheduled_time, scheduled_at)
        VALUES (${id}, ${imageUrl}, ${imagePathname || null}, ${caption.trim()}, ${date}, ${time}, ${timestamp.toISOString()})
        RETURNING *`;

      sendJson(res, 201, { post: toPost(rows[0]) });
      return;
    }

    if (req.method === "DELETE") {
      const id = getRequestUrl(req).searchParams.get("id");
      if (!id) {
        sendJson(res, 400, { error: "Missing post id." });
        return;
      }

      await getSql()`DELETE FROM scheduled_posts WHERE id = ${id}`;
      sendJson(res, 200, { ok: true });
      return;
    }

    sendJson(res, 405, { error: "Method not allowed" });
  } catch (error) {
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : "Could not load scheduled posts.",
    });
  }
}
