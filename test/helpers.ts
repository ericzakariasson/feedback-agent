import type { FeedbackPayload, SessionBundle } from "../src/shared/types";

export function sampleSession(overrides: Partial<SessionBundle> = {}): SessionBundle {
  return {
    id: "session-1",
    startedAt: "2026-07-31T08:00:00.000Z",
    capturedAt: "2026-07-31T08:04:00.000Z",
    windowMs: 300_000,
    href: "https://app.example.com/settings",
    urlHistory: [
      {
        href: "https://app.example.com/",
        title: "Home",
        timestamp: "2026-07-31T08:00:00.000Z",
      },
      {
        href: "https://app.example.com/settings",
        title: "Settings",
        timestamp: "2026-07-31T08:03:00.000Z",
      },
    ],
    breadcrumbs: [
      {
        type: "navigation",
        timestamp: "2026-07-31T08:03:00.000Z",
        href: "https://app.example.com/settings",
        message: "Settings",
      },
      {
        type: "click",
        timestamp: "2026-07-31T08:03:30.000Z",
        name: "button",
        message: "Save",
        data: { path: "form > button.save" },
      },
    ],
    errors: [
      {
        timestamp: "2026-07-31T08:03:40.000Z",
        type: "error",
        message: "Cannot read properties of undefined (reading 'plan')",
        stack: "TypeError: ...\n    at savePlan (settings.js:12:3)",
      },
    ],
    replay: {
      format: "rrweb",
      events: [{ type: 2, timestamp: Date.parse("2026-07-31T08:03:00.000Z") }],
      eventCount: 1,
      truncated: false,
    },
    metadata: {
      viewport: { width: 1280, height: 720 },
      locale: "en-US",
      timezone: "Europe/Paris",
      userAgent: "vitest",
      appVersion: "0.0.0-test",
    },
    ...overrides,
  };
}

export function samplePayload(overrides: Partial<FeedbackPayload> = {}): FeedbackPayload {
  const session = overrides.session ?? sampleSession();
  return {
    eventId: "evt_123",
    sessionId: session.id,
    message: "Saving settings crashes after I click Save.",
    screenshots: [],
    session,
    submittedAt: "2026-07-31T08:04:01.000Z",
    ...overrides,
  };
}

export function post(handler: (request: Request) => Promise<Response>, body: unknown, headers?: HeadersInit) {
  return handler(
    new Request("http://localhost/api/feedback", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    }),
  );
}
