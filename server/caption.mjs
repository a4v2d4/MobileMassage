const SYSTEM_PROMPT = `You are a social media copywriter for Sonoma Bodyworks, a massage and bodywork studio in Sonoma County, California.
Write warm, grounded, inviting Instagram captions that feel human and authentic, never corporate or pushy.
Tone: calm, nurturing, rooted in the beauty of Sonoma. Speak directly to someone who deserves rest and restoration.
Format: 2-3 short paragraphs. End with a gentle call to action (book a session, link in bio, DM to schedule).
Do NOT include hashtags.`;

function fallbackCaption(notes) {
  const detail = notes?.trim()
    ? `\n\n${notes.trim()}`
    : "\n\nA quiet reminder that rest is part of caring for the body, not a reward you have to earn.";

  return `Take a slower breath and let your shoulders drop. Sonoma Bodyworks is here for the kind of reset that helps you feel more at home in your body.${detail}

When you are ready for a little more ease, book a session or send a DM to schedule.`;
}

function sendJson(res, status, body) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export async function handleCaptionRequest(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const { image, mediaType, notes } = await readJson(req);

    if (!image || typeof image !== "string") {
      sendJson(res, 400, { error: "Missing image data." });
      return;
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      sendJson(res, 200, {
        caption: fallbackCaption(notes),
        warning: "Set ANTHROPIC_API_KEY in .env for live AI captions. This is a local draft.",
      });
      return;
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType || "image/jpeg",
                  data: image,
                },
              },
              {
                type: "text",
                text: notes
                  ? `Write an Instagram caption for this photo. Context from the business: "${notes}"`
                  : "Write an Instagram caption for this photo of our bodywork studio or services.",
              },
            ],
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      sendJson(res, response.status, {
        error: data?.error?.message || "Anthropic could not generate a caption.",
      });
      return;
    }

    const caption = data.content?.find((block) => block.type === "text")?.text;
    if (!caption) {
      sendJson(res, 502, { error: "Anthropic returned no caption text." });
      return;
    }

    sendJson(res, 200, { caption });
  } catch (error) {
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : "Could not generate caption.",
    });
  }
}
