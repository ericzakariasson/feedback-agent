import type { SessionBundle } from "../shared/types";

export interface FeedbackDebugScreenshot {
  name: string
  mimeType: string
  bytes: number
  width?: number
  height?: number
}

export interface FeedbackDebugContext {
  endpoint: string
  note: string
  payload: {
    eventId: string
    sessionId: string
    message: string
    screenshots: FeedbackDebugScreenshot[]
    session: SessionBundle | null | (Omit<SessionBundle, "replay"> & {
      replay?: Omit<NonNullable<SessionBundle["replay"]>, "events"> & {
        events: unknown[] | string
      }
    })
    submittedAt: string
  }
}

export function buildDebugContext(input: {
  endpoint: string
  message: string
  screenshots: FeedbackDebugScreenshot[]
  session: SessionBundle | null
  includeReplayEvents?: boolean
}): FeedbackDebugContext {
  const session = input.session
    ? {
        ...input.session,
        replay: input.session.replay
          ? {
              ...input.session.replay,
              events: input.includeReplayEvents
                ? input.session.replay.events
                : `[${input.session.replay.eventCount} rrweb events omitted]`,
            }
          : undefined,
      }
    : null;

  return {
    endpoint: input.endpoint,
    note: "This is the browser payload. createFeedbackHandler enrich() adds server context after POST and is not shown here.",
    payload: {
      eventId: "(assigned on submit)",
      sessionId: input.session?.id ?? "(session capture is not running)",
      message: input.message,
      screenshots: input.screenshots,
      session,
      submittedAt: "(assigned on submit)",
    },
  };
}
