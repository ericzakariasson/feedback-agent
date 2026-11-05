import type { CSSProperties, ReactNode } from "react";
import type { FeedbackHandlerSuccess } from "../shared/types";

export type FeedbackSubmitResult = FeedbackHandlerSuccess;

export interface ScreenshotItem {
  id: string
  name: string
  mimeType: string
  blob: Blob
  url: string
  width?: number
  height?: number
}

export interface FeedbackCaptureConfig {
  /** When false, capture does not start until `setCaptureEnabled(true)`. Default true. */
  enabled?: boolean
  windowMs?: number
  recordReplay?: boolean
  maskInputs?: boolean
  consoleErrors?: boolean
}

export interface FeedbackProviderProps {
  endpoint: string
  children: ReactNode
  appVersion?: string
  capture?: FeedbackCaptureConfig
}

export interface FeedbackWidgetClassNames {
  root?: string
  trigger?: string
  overlay?: string
  panel?: string
  header?: string
  title?: string
  close?: string
  textarea?: string
  screenshots?: string
  thumbnail?: string
  actions?: string
  submit?: string
  secondary?: string
  error?: string
  thanks?: string
}

export interface FeedbackWidgetProps {
  title?: string
  placeholder?: string
  triggerLabel?: string
  submitLabel?: string
  thanksTitle?: string
  thanksBody?: string
  /** Inspect UI. On in development by default; pass `false` to hide. Always off in production. */
  debug?: boolean
  className?: string
  classNames?: FeedbackWidgetClassNames
  style?: CSSProperties
}
