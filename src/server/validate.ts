import {
  ALLOWED_IMAGE_TYPES,
  DEFAULT_LIMITS,
} from "../shared/limits";
import type {
  Breadcrumb,
  FeedbackPayload,
  ScreenshotPayload,
  SessionBundle,
  SessionError,
  UrlEntry,
} from "../shared/types";
import type { ResolvedLimits, TrustProxy } from "./types";

export function resolveLimits(
  limits: Partial<typeof DEFAULT_LIMITS> | undefined,
): ResolvedLimits {
  return { ...DEFAULT_LIMITS, ...limits };
}

export function clientKey(request: Request, trustProxy: TrustProxy = false): string {
  if (trustProxy === "cf") {
    return request.headers.get("cf-connecting-ip")?.trim() || "unknown";
  }
  if (trustProxy === "x-forwarded-for") {
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0]!.trim() || "unknown";
    return "unknown";
  }
  if (trustProxy === true) {
    const cf = request.headers.get("cf-connecting-ip")?.trim();
    if (cf) return cf;
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0]!.trim() || "unknown";
    return request.headers.get("x-real-ip")?.trim() || "unknown";
  }
  return "unknown";
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

  const session = parseSession(input.session, limits);
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
  limits: ResolvedLimits,
): { ok: true; value: SessionBundle } | { ok: false; error: string } {
  if (!isRecord(input)) return { ok: false, error: "session is required" };
  let serialized: string;
  try {
    serialized = JSON.stringify(input);
  } catch {
    return { ok: false, error: "session is not serializable" };
  }
  if (serialized.length > limits.maxSessionBytes) {
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
  const viewportWidth = input.metadata.viewport.width;
  const viewportHeight = input.metadata.viewport.height;
  if (typeof viewportWidth !== "number" || typeof viewportHeight !== "number") {
    return { ok: false, error: "session.metadata is invalid" };
  }

  const urlHistory = Array.isArray(input.urlHistory)
    ? input.urlHistory.slice(-limits.maxUrlHistory).flatMap((entry) => {
        if (!isRecord(entry)) return [];
        const entryHref = asNonEmptyString(entry.href);
        const timestamp = asNonEmptyString(entry.timestamp);
        if (!entryHref || !timestamp) return [];
        const item: UrlEntry = {
          href: entryHref,
          timestamp,
          title: typeof entry.title === "string" ? entry.title.slice(0, 200) : undefined,
        };
        return [item];
      })
    : [];

  const breadcrumbs = Array.isArray(input.breadcrumbs)
    ? input.breadcrumbs.slice(-limits.maxBreadcrumbs).flatMap((entry) => {
        if (!isRecord(entry)) return [];
        const type = entry.type;
        const timestamp = asNonEmptyString(entry.timestamp);
        if (!timestamp) return [];
        if (
          type !== "navigation" &&
          type !== "click" &&
          type !== "track" &&
          type !== "error" &&
          type !== "console"
        ) {
          return [];
        }
        const item: Breadcrumb = {
          type,
          timestamp,
          name: typeof entry.name === "string" ? entry.name.slice(0, 120) : undefined,
          message: typeof entry.message === "string" ? entry.message.slice(0, 500) : undefined,
          href: typeof entry.href === "string" ? entry.href : undefined,
          data: isRecord(entry.data) ? entry.data : undefined,
        };
        return [item];
      })
    : [];

  const errors = Array.isArray(input.errors)
    ? input.errors.slice(-limits.maxErrors).flatMap((entry) => {
        if (!isRecord(entry)) return [];
        const timestamp = asNonEmptyString(entry.timestamp);
        const message = asNonEmptyString(entry.message);
        const type = entry.type;
        if (!timestamp || !message) return [];
        if (type !== "error" && type !== "unhandledrejection" && type !== "console") return [];
        const item: SessionError = {
          timestamp,
          type,
          message: message.slice(0, 500),
          stack: typeof entry.stack === "string" ? entry.stack.slice(0, 1_500) : undefined,
          filename: typeof entry.filename === "string" ? entry.filename : undefined,
          lineno: typeof entry.lineno === "number" ? entry.lineno : undefined,
          colno: typeof entry.colno === "number" ? entry.colno : undefined,
        };
        return [item];
      })
    : [];

  let replay: SessionBundle["replay"];
  if (input.replay != null) {
    if (!isRecord(input.replay)) return { ok: false, error: "session.replay is invalid" };
    const events = Array.isArray(input.replay.events) ? input.replay.events : [];
    replay = {
      format: "rrweb",
      events,
      eventCount:
        typeof input.replay.eventCount === "number" ? input.replay.eventCount : events.length,
      truncated: Boolean(input.replay.truncated),
    };
  }

  const metadataRecord = input.metadata;
  return {
    ok: true,
    value: {
      id,
      startedAt,
      capturedAt,
      windowMs: input.windowMs,
      href,
      urlHistory,
      breadcrumbs,
      errors,
      replay,
      metadata: {
        viewport: { width: viewportWidth, height: viewportHeight },
        locale: typeof metadataRecord.locale === "string" ? metadataRecord.locale : undefined,
        timezone: typeof metadataRecord.timezone === "string" ? metadataRecord.timezone : undefined,
        userAgent: typeof metadataRecord.userAgent === "string" ? metadataRecord.userAgent : undefined,
        appVersion: typeof metadataRecord.appVersion === "string" ? metadataRecord.appVersion : undefined,
        platform: typeof metadataRecord.platform === "string" ? metadataRecord.platform : undefined,
      },
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
