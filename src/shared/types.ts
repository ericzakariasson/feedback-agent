import type { AllowedImageType } from "./limits";

export type { AllowedImageType };

export type BreadcrumbType = "navigation" | "click" | "track" | "error" | "console";

export interface Breadcrumb {
  type: BreadcrumbType
  timestamp: string
  name?: string
  message?: string
  href?: string
  data?: Record<string, unknown>
}

export interface SessionError {
  timestamp: string
  type: "error" | "unhandledrejection" | "console"
  message: string
  stack?: string
  filename?: string
  lineno?: number
  colno?: number
}

export interface UrlEntry {
  href: string
  title?: string
  timestamp: string
}

export interface SessionReplay {
  format: "rrweb"
  events: unknown[]
  eventCount: number
  truncated: boolean
}

export interface SessionMetadata {
  viewport: { width: number; height: number }
  locale?: string
  timezone?: string
  userAgent?: string
  appVersion?: string
  platform?: string
}

export interface SessionBundle {
  id: string
  startedAt: string
  capturedAt: string
  windowMs: number
  href: string
  urlHistory: UrlEntry[]
  breadcrumbs: Breadcrumb[]
  errors: SessionError[]
  replay?: SessionReplay
  metadata: SessionMetadata
}

export interface ScreenshotPayload {
  name?: string
  mimeType: AllowedImageType
  data: string
  width?: number
  height?: number
}

export interface FeedbackPayload {
  eventId: string
  sessionId: string
  message: string
  screenshots: ScreenshotPayload[]
  session: SessionBundle
  submittedAt: string
}

export interface EnrichFeedback {
  eventId: string
  sessionId: string
  message: string
  submittedAt: string
  screenshotCount: number
}

export interface EnrichInput {
  request: Request
  feedback: EnrichFeedback
  session: SessionBundle
}

export type EnrichResult =
  | { dispatch: false; reason?: string }
  | { dispatch?: true; context?: Record<string, unknown> }

export interface FeedbackHandlerSuccess {
  ok: true
  dispatched: boolean
  feedbackId: string
  agentId?: string
  agentUrl?: string
  dryRun?: boolean
  reason?: string
}

export interface FeedbackHandlerErrorBody {
  ok: false
  error: string
}
