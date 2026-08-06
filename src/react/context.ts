import { createContext } from "react";
import type { SessionBundle } from "../shared/types";
import type { FeedbackDebugContext } from "./preview";
import type { FeedbackSubmitResult, ScreenshotItem } from "./types";

export type FeedbackStatus = "idle" | "submitting" | "success" | "error";

export interface FeedbackContextValue {
  endpoint: string
  isOpen: boolean
  open: () => void
  close: () => void
  message: string
  setMessage: (value: string) => void
  screenshots: ScreenshotItem[]
  addScreenshot: (file: Blob, name?: string) => Promise<void>
  removeScreenshot: (id: string) => void
  captureScreenshot: () => Promise<void>
  getDebugContext: (options?: { includeReplayEvents?: boolean }) => FeedbackDebugContext
  getSession: () => SessionBundle | null
  status: FeedbackStatus
  error: string | null
  feedbackId: string | null
  result: FeedbackSubmitResult | null
  captureEnabled: boolean
  setCaptureEnabled: (enabled: boolean) => void
  submit: () => Promise<void>
  track: (name: string, props?: Record<string, unknown>) => void
  reset: () => void
}

export const FeedbackContext = createContext<FeedbackContextValue | null>(null);
