import type {
  EnrichInput,
  EnrichResult,
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
  rateLimitMax?: number
  rateLimitWindowMs?: number
}

export interface CreateFeedbackHandlerOptions {
  cursorApiKey: string
  repo: FeedbackRepo
  enrich: (input: EnrichInput) => Promise<EnrichResult> | EnrichResult
  /** Wrap or replace the default Cursor prompt. Runs after `enrich`. */
  prompt?: (input: PromptInput) => string | Promise<string>
  model?: string
  agentName?: string
  dryRun?: boolean
  cursorApiBaseUrl?: string
  skipReviewerRequest?: boolean
  limits?: FeedbackHandlerLimits
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
  FeedbackPayload,
  ScreenshotPayload,
  SessionBundle,
};
