import type {
  EnrichInput,
  EnrichResult,
  FeedbackHandlerSuccess,
  FeedbackPayload,
  ScreenshotPayload,
  SessionBundle,
} from "../shared/types";
import type { DEFAULT_LIMITS } from "../shared/limits";

export interface FeedbackRepo {
  url: string
  ref?: string
}

export interface PromptInput {
  feedbackId: string
  message: string
  submittedAt: string
  session: SessionBundle
  enrichment?: Record<string, unknown>
  defaultPrompt: string
}

export interface FeedbackHandlerLimits {
  maxBodyBytes?: number
  maxMessageChars?: number
  maxScreenshots?: number
  maxScreenshotBytes?: number
  maxSessionBytes?: number
  maxBreadcrumbs?: number
  maxErrors?: number
  maxUrlHistory?: number
  maxEnrichmentChars?: number
  maxPromptChars?: number
  rateLimitMax?: number
  rateLimitWindowMs?: number
  dedupeWindowMs?: number
}

export type TrustProxy = boolean | "cf" | "x-forwarded-for";

export type FeedbackHandlerEventName =
  | "accepted"
  | "skipped"
  | "dispatched"
  | "dry_run"
  | "rate_limited"
  | "invalid"
  | "upstream_failed";

export interface FeedbackStore {
  checkRateLimit(
    key: string,
    limit: { max: number; windowMs: number },
  ): boolean | Promise<boolean>
  getDedupe(eventId: string): FeedbackHandlerSuccess | null | Promise<FeedbackHandlerSuccess | null>
  setDedupe(
    eventId: string,
    result: FeedbackHandlerSuccess,
    ttlMs: number,
  ): void | Promise<void>
}

export type FeedbackHandlerErrorStage = "enrich" | "prompt" | "accepted" | "dispatch";

export interface CreateFeedbackHandlerOptions {
  cursorApiKey?: string
  repo: FeedbackRepo
  enrich: (input: EnrichInput) => Promise<EnrichResult> | EnrichResult
  /** Wrap or replace the default Cursor prompt. Runs after `enrich`. */
  prompt?: (input: PromptInput) => string | Promise<string>
  model?: string
  agentName?: string
  dryRun?: boolean
  cursorApiBaseUrl?: string
  skipReviewerRequest?: boolean
  /** Default true. Set false for public widgets until a human triages. */
  autoCreatePR?: boolean
  /**
   * Client IP source for rate limiting.
   * Default false ignores forwarded headers (every client shares `"unknown"` unless you key off `enrich`).
   */
  trustProxy?: TrustProxy
  limits?: FeedbackHandlerLimits
  store?: FeedbackStore
  onError?: (error: unknown, context: { stage: FeedbackHandlerErrorStage }) => void
  onAccepted?: (event: {
    payload: FeedbackPayload
    enrichment?: Record<string, unknown>
  }) => void | Promise<void>
  onEvent?: (name: FeedbackHandlerEventName, data: Record<string, unknown>) => void
}

export type ResolvedLimits = {
  [K in keyof typeof DEFAULT_LIMITS]: number
};

export interface DispatchResult {
  agentId: string
  agentUrl?: string
  runId?: string
}

export type {
  EnrichInput,
  EnrichResult,
  FeedbackHandlerSuccess,
  FeedbackPayload,
  ScreenshotPayload,
  SessionBundle,
};
