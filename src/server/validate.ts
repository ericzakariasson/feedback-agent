import {
  ALLOWED_IMAGE_TYPES,
  DEFAULT_LIMITS,
} from "../shared/limits";
import type {
  FeedbackPayload,
  ScreenshotPayload,
  SessionBundle,
} from "../shared/types";
import type { ResolvedLimits } from "./types";

export function resolveLimits(
  limits: Partial<typeof DEFAULT_LIMITS> | undefined,
): ResolvedLimits {
  return { ...DEFAULT_LIMITS, ...limits };
}

export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function readJsonBody(
  request: Request,
  maxBodyBytes: number,
): Promise<{ ok: true; value: unknown } | { ok: false; status: number; error: string }> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > maxBodyBytes) {
    return { ok: false, status: 413, error: "Payload too large" };
  }
  const buffer = await request.arrayBuffer();
  if (buffer.byteLength > maxBodyBytes) {
    return { ok: false, status: 413, error: "Payload too large" };
  }
  try {
    return { ok: true, value: JSON.parse(new TextDecoder().decode(buffer)) as unknown };
  } catch {
    return { ok: false, status: 400, error: "Invalid JSON" };
  }
}

export function validatePayload(
  input: unknown,
  limits: ResolvedLimits,
): { ok: true; payload: FeedbackPayload } | { ok: false; error: string } {
  if (!isRecord(input)) return { ok: false, error: "Payload must be an object" };

  const eventId = asNonEmptyString(input.eventId);
  const sessionId = asNonEmptyString(input.sessionId);
  const message = asNonEmptyString(input.message);
  const submittedAt = asNonEmptyString(input.submittedAt);
  if (!eventId || !sessionId || !message || !submittedAt) {
    return { ok: false, error: "eventId, sessionId, message, and submittedAt are required" };
  }
  if (message.length > limits.maxMessageChars) {
    return { ok: false, error: `message must be <= ${limits.maxMessageChars} characters` };
  }
  if (Number.isNaN(Date.parse(submittedAt))) {
    return { ok: false, error: "submittedAt must be an ISO timestamp" };
  }
  if (!Array.isArray(input.screenshots)) {
    return { ok: false, error: "screenshots must be an array" };
  }
  if (input.screenshots.length > limits.maxScreenshots) {
    return { ok: false, error: `at most ${limits.maxScreenshots} screenshots are allowed` };
  }

  const screenshots: ScreenshotPayload[] = [];
  for (const shot of input.screenshots) {
    const parsed = parseScreenshot(shot, limits.maxScreenshotBytes);
    if (!parsed.ok) return parsed;
    screenshots.push(parsed.value);
  }

  const session = parseSession(input.session, limits.maxSessionBytes);
  if (!session.ok) return session;
  if (session.value.id !== sessionId) {
    return { ok: false, error: "session.id must match sessionId" };
  }

  return {
    ok: true,
    payload: {
      eventId,
      sessionId,
      message,
      screenshots,
      session: session.value,
      submittedAt,
    },
  };
}

function parseScreenshot(
  input: unknown,
  maxScreenshotBytes: number,
): { ok: true; value: ScreenshotPayload } | { ok: false; error: string } {
  if (!isRecord(input)) return { ok: false, error: "invalid screenshot" };
  const mimeType = asNonEmptyString(input.mimeType);
  const data = asNonEmptyString(input.data);
  if (!mimeType || !data) return { ok: false, error: "screenshot mimeType and data are required" };
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(mimeType)) {
    return { ok: false, error: "unsupported screenshot type" };
  }
  if (data.startsWith("data:")) {
    return { ok: false, error: "screenshot data must be raw base64, not a data URL" };
  }
  const bytes = Math.floor((data.length * 3) / 4);
  if (bytes > maxScreenshotBytes) {
    return { ok: false, error: "screenshot exceeds size limit" };
  }
  return {
    ok: true,
    value: {
      name: typeof input.name === "string" ? input.name.slice(0, 120) : undefined,
      mimeType: mimeType as ScreenshotPayload["mimeType"],
      data,
      width: typeof input.width === "number" ? input.width : undefined,
      height: typeof input.height === "number" ? input.height : undefined,
    },
  };
}

function parseSession(
  input: unknown,
  maxSessionBytes: number,
): { ok: true; value: SessionBundle } | { ok: false; error: string } {
  if (!isRecord(input)) return { ok: false, error: "session is required" };
  let serialized: string;
  try {
    serialized = JSON.stringify(input);
  } catch {
    return { ok: false, error: "session is not serializable" };
  }
  if (serialized.length > maxSessionBytes) {
    return { ok: false, error: "session bundle exceeds size limit" };
  }
  const id = asNonEmptyString(input.id);
  const startedAt = asNonEmptyString(input.startedAt);
  const capturedAt = asNonEmptyString(input.capturedAt);
  const href = asNonEmptyString(input.href);
  if (!id || !startedAt || !capturedAt || !href) {
    return { ok: false, error: "session is missing required fields" };
  }
  if (typeof input.windowMs !== "number" || input.windowMs <= 0) {
    return { ok: false, error: "session.windowMs is invalid" };
  }
  if (!isRecord(input.metadata) || !isRecord(input.metadata.viewport)) {
    return { ok: false, error: "session.metadata is invalid" };
  }
  return { ok: true, value: input as unknown as SessionBundle };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
