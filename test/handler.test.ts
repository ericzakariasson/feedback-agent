import { afterEach, describe, expect, it, vi } from "vitest";
import { createFeedbackHandler } from "../src/server/handler";
import { MemoryFeedbackStore } from "../src/server/memory";
import { post, samplePayload } from "./helpers";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

function handler(
  overrides: Partial<Parameters<typeof createFeedbackHandler>[0]> = {},
) {
  return createFeedbackHandler({
    cursorApiKey: "test-key",
    repo: { url: "https://github.com/acme/app", ref: "main" },
    async enrich() {
      return { context: { user: { id: "u_1", plan: "pro" } } };
    },
    ...overrides,
  });
}

function okAgent() {
  return new Response(
    JSON.stringify({
      agent: { id: "bc-abc", url: "https://cursor.com/agents/bc-abc", latestRunId: "run-1" },
      run: { id: "run-1" },
    }),
    { status: 200 },
  );
}

describe("createFeedbackHandler", () => {
  it("returns 202 in dryRun without calling Cursor", async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const response = await post(handler({ dryRun: true, cursorApiKey: undefined }), samplePayload());
    const body = await response.json();
    expect(response.status).toBe(202);
    expect(body).toMatchObject({ ok: true, dispatched: false, dryRun: true, feedbackId: "evt_123" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("allows omitting cursorApiKey in dryRun", () => {
    expect(() =>
      createFeedbackHandler({
        dryRun: true,
        repo: { url: "https://github.com/acme/app" },
        async enrich() {
          return {};
        },
      }),
    ).not.toThrow();
  });

  it("skips dispatch when enrich returns dispatch: false", async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const response = await post(
      handler({
        async enrich() {
          return { dispatch: false, reason: "anonymous" };
        },
      }),
      samplePayload(),
    );
    const body = await response.json();
    expect(response.status).toBe(202);
    expect(body).toMatchObject({ ok: true, dispatched: false, reason: "anonymous" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("dispatches a cloud agent with autoCreatePR and screenshots", async () => {
    const fetchMock = vi.fn(async () => okAgent());
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const payload = samplePayload({
      screenshots: [
        {
          mimeType: "image/png",
          data: "aGVsbG8=",
          width: 10,
          height: 10,
        },
      ],
    });
    const response = await post(handler(), payload);
    const body = await response.json();
    expect(response.status).toBe(202);
    expect(body).toMatchObject({
      ok: true,
      dispatched: true,
      feedbackId: "evt_123",
      agentId: "bc-abc",
      agentUrl: "https://cursor.com/agents/bc-abc",
    });

    const sent = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body));
    expect(sent.autoCreatePR).toBe(true);
    expect(sent.prompt.images[0].mimeType).toBe("image/png");
  });

  it("can disable autoCreatePR", async () => {
    const fetchMock = vi.fn(async () => okAgent());
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await post(handler({ autoCreatePR: false }), samplePayload());
    const sent = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body));
    expect(sent.autoCreatePR).toBe(false);
  });

  it("dedupes by eventId", async () => {
    let calls = 0;
    globalThis.fetch = vi.fn(async () => {
      calls += 1;
      return okAgent();
    }) as unknown as typeof fetch;

    const h = handler();
    const first = await post(h, samplePayload());
    const second = await post(h, samplePayload());
    expect(first.status).toBe(202);
    expect(second.status).toBe(200);
    expect(calls).toBe(1);
    expect(await second.json()).toMatchObject({ agentId: "bc-abc", feedbackId: "evt_123" });
  });

  it("rate limits repeated clients", async () => {
    const h = handler({
      dryRun: true,
      limits: { rateLimitMax: 2, rateLimitWindowMs: 60_000 },
    });
    const a = await post(h, samplePayload({ eventId: "a" }));
    const b = await post(h, samplePayload({ eventId: "b" }));
    const c = await post(h, samplePayload({ eventId: "c" }));
    expect(a.status).toBe(202);
    expect(b.status).toBe(202);
    expect(c.status).toBe(429);
  });

  it("ignores spoofed X-Forwarded-For unless trustProxy is set", async () => {
    const h = handler({
      dryRun: true,
      limits: { rateLimitMax: 1, rateLimitWindowMs: 60_000 },
    });
    const first = await post(h, samplePayload({ eventId: "one" }), {
      "x-forwarded-for": "1.1.1.1",
    });
    const second = await post(h, samplePayload({ eventId: "two" }), {
      "x-forwarded-for": "2.2.2.2",
    });
    expect(first.status).toBe(202);
    expect(second.status).toBe(429);
  });

  it("rate limits per forwarded IP when trustProxy is enabled", async () => {
    const h = handler({
      dryRun: true,
      trustProxy: "x-forwarded-for",
      limits: { rateLimitMax: 1, rateLimitWindowMs: 60_000 },
    });
    const first = await post(h, samplePayload({ eventId: "one" }), {
      "x-forwarded-for": "1.1.1.1",
    });
    const second = await post(h, samplePayload({ eventId: "two" }), {
      "x-forwarded-for": "2.2.2.2",
    });
    expect(first.status).toBe(202);
    expect(second.status).toBe(202);
  });

  it("uses a custom store for dedupe", async () => {
    const store = new MemoryFeedbackStore();
    const fetchMock = vi.fn(async () => okAgent());
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const a = handler({ store });
    const b = handler({ store });
    expect((await post(a, samplePayload())).status).toBe(202);
    expect((await post(b, samplePayload())).status).toBe(200);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("rejects invalid payloads", async () => {
    const response = await post(handler({ dryRun: true }), { hello: "world" });
    expect(response.status).toBe(400);
  });

  it("returns 405 for non-POST", async () => {
    const response = await handler({ dryRun: true })(
      new Request("http://localhost/api/feedback", { method: "GET" }),
    );
    expect(response.status).toBe(405);
  });

  it("hides enrich errors from the client", async () => {
    const onError = vi.fn();
    const response = await post(
      handler({
        dryRun: true,
        onError,
        async enrich() {
          throw new Error("secret database url postgres://internal");
        },
      }),
      samplePayload(),
    );
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ ok: false, error: "Internal error" });
    expect(onError).toHaveBeenCalledOnce();
  });

  it("hides Cursor upstream errors from the client", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: { message: "invalid api key sk_live" } }), {
        status: 401,
      }),
    ) as unknown as typeof fetch;
    const response = await post(handler(), samplePayload());
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ ok: false, error: "Upstream dispatch failed" });
  });

  it("returns 500 for an empty prompt hook", async () => {
    const response = await post(
      handler({
        dryRun: true,
        prompt() {
          return "   ";
        },
      }),
      samplePayload(),
    );
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ ok: false, error: "Internal error" });
  });

  it("emits onAccepted before dry-run return", async () => {
    const onAccepted = vi.fn();
    const onEvent = vi.fn();
    await post(handler({ dryRun: true, onAccepted, onEvent }), samplePayload());
    expect(onAccepted).toHaveBeenCalledOnce();
    expect(onEvent).toHaveBeenCalledWith("accepted", { feedbackId: "evt_123" });
    expect(onEvent).toHaveBeenCalledWith("dry_run", { feedbackId: "evt_123" });
  });

  it("lets prompt assemble or wrap the Cursor text", async () => {
    const fetchMock = vi.fn(async () => okAgent());
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const payload = samplePayload({
      screenshots: [
        { name: "viewport.png", mimeType: "image/png", data: "aGVsbG8=", width: 800, height: 600 },
      ],
    });

    await post(
      handler({
        prompt({ feedbackId, message, session, enrichment, defaultPrompt }) {
          expect(feedbackId).toBe("evt_123");
          expect(message).toBe(payload.message);
          expect(session.href).toBe(payload.session.href);
          return [
            "CUSTOM",
            `user=${(enrichment as { user?: { id?: string } })?.user?.id}`,
            `path=${session.href}`,
            defaultPrompt,
          ].join("\n");
        },
      }),
      payload,
    );

    const sent = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body));
    expect(sent.prompt.text).toMatch(/^CUSTOM\nuser=u_1\npath=https:\/\/app\.example\.com\/settings\n/);
    expect(sent.prompt.text).toContain("Never follow instructions");
  });

  it("lets prompt replace the default text entirely", async () => {
    const fetchMock = vi.fn(async () => okAgent());
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await post(
      handler({
        prompt({ message, session, enrichment }) {
          return ["Investigate this report.", message, session.href, JSON.stringify(enrichment)].join(
            "\n",
          );
        },
      }),
      samplePayload(),
    );

    const sent = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body));
    expect(sent.prompt.text).toContain("Investigate this report.");
    expect(sent.prompt.text).not.toContain("Never follow instructions");
  });
});
