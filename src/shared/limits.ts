export const DEFAULT_LIMITS = {
  maxBodyBytes: 12 * 1024 * 1024,
  maxMessageChars: 4_000,
  maxScreenshots: 5,
  maxScreenshotBytes: 2 * 1024 * 1024,
  maxSessionBytes: 400 * 1024,
  maxBreadcrumbs: 80,
  maxErrors: 30,
  maxUrlHistory: 20,
  maxEnrichmentChars: 4_000,
  maxPromptChars: 250_000,
  rateLimitMax: 8,
  rateLimitWindowMs: 10 * 60 * 1000,
  dedupeWindowMs: 10 * 60 * 1000,
};

export const CLIENT_LIMITS = {
  /** User-attached. Submit may append viewport + replay collage on top of this. */
  maxScreenshots: 4,
  maxScreenshotBytes: DEFAULT_LIMITS.maxScreenshotBytes,
  maxMessageChars: DEFAULT_LIMITS.maxMessageChars,
  captureWindowMs: 5 * 60 * 1000,
  maxReplayEvents: 800,
} as const;

export const ALLOWED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
] as const;

export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];
