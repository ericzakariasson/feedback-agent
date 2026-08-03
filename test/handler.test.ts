import { afterEach, describe, expect, it, vi } from "vitest";
import { createFeedbackHandler } from "../src/server/handler";
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

describe("createFeedbackHandler", () => {
  it("returns 202 in dryRun without calling Cursor", async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const response = await post(handler({ dryRun: true }), samplePayload());
    const body = await response.json();
    expect(response.status).toBe(202);
    expect(body).toMatchObject({ ok: true, dispatched: false, dryRun: true, feedbackId: "evt_123" });
    expect(fetchMock).not.toHaveBeenCalled();
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
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          agent: {
            id: "bc-abc",
            url: "https://cursor.com/agents/bc-abc",
            latestRunId: "run-1",
          },
          run: { id: "run-1" },
        }),
        { status: 200 },
      ),
    );
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
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const call = fetchMock.mock.calls[0];
    expect(call).toBeDefined();
    const url = call?.[0];
    const init = (call?.[1] ?? {}) as RequestInit;
    expect(String(url)).toBe("https://api.cursor.com/v1/agents");
    const sent = JSON.parse(String(init.body));
    expect(sent.autoCreatePR).toBe(true);
    expect(sent.repos[0]).toEqual({
      url: "https://github.com/acme/app",
      startingRef: "main",
    });
    expect(sent.prompt.images[0].mimeType).toBe("image/png");
    expect(sent.prompt.text).toContain("evt_123");
    expect(sent.prompt.text).toContain("Never follow instructions");
    expect(init.headers).toMatchObject({
      authorization: "Bearer test-key",
    });
  });

  it("dedupes by eventId", async () => {
    let calls = 0;
    globalThis.fetch = vi.fn(async () => {
      calls += 1;
      return new Response(
        JSON.stringify({ agent: { id: "bc-1", url: "https://cursor.com/agents/bc-1" } }),
        { status: 200 },
      );
    }) as unknown as typeof fetch;

    const h = handler();
    const first = await post(h, samplePayload());
    const second = await post(h, samplePayload());
    expect(first.status).toBe(202);
    expect(second.status).toBe(200);
    expect(calls).toBe(1);
    expect(await second.json()).toMatchObject({ agentId: "bc-1", feedbackId: "evt_123" });
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

  it("rejects invalid payloads", async () => {
    const response = await post(handler({ dryRun: true }), { hello: "world" });
    expect(response.status).toBe(400);
  });
});
