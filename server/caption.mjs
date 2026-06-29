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

import { OpenRouter } from "@openrouter/sdk";
import { readJson, sendJson } from "./http.mjs";

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

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      sendJson(res, 200, {
        caption: fallbackCaption(notes),
        warning: "Set OPENROUTER_API_KEY in .env for live AI captions. This is a local draft.",
      });
      return;
    }

    const mediaUrl = `data:${mediaType || "image/jpeg"};base64,${image}`;
    const openrouter = new OpenRouter({ apiKey });
    const response = await openrouter.chat.send({
      chatRequest: {
        model: process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini",
        maxTokens: 1000,
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: notes
                  ? `Write an Instagram caption for this photo. Context from the business: "${notes}"`
                  : "Write an Instagram caption for this photo of our bodywork studio or services.",
              },
              {
                type: "image_url",
                imageUrl: {
                  url: mediaUrl,
                },
              },
            ],
          },
        ],
      },
    });

    const caption = response.choices?.[0]?.message?.content;
    if (!caption) {
      sendJson(res, 502, { error: "OpenRouter returned no caption text." });
      return;
    }

    sendJson(res, 200, { caption });
  } catch (error) {
    const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
    const fallbackMessage =
      statusCode === 500 ? "Could not generate caption." : "OpenRouter could not generate a caption.";

    sendJson(res, statusCode, {
      error: error instanceof Error ? error.message : fallbackMessage,
    });
  }
}
