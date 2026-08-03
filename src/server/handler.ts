import { DEFAULT_LIMITS } from "../shared/limits";
import type {
  FeedbackHandlerErrorBody,
  FeedbackHandlerSuccess,
} from "../shared/types";
import { dispatchCloudAgent } from "./cursor";
import { SlidingWindowLimiter, TtlMap } from "./memory";
import { agentDisplayName, buildAgentPrompt } from "./prompt";
import type { CreateFeedbackHandlerOptions } from "./types";
import { clientKey, readJsonBody, resolveLimits, validatePayload } from "./validate";

export function createFeedbackHandler(options: CreateFeedbackHandlerOptions) {
  if (!options.cursorApiKey && !options.dryRun) {
    throw new Error("createFeedbackHandler requires cursorApiKey, or dryRun: true");
  }
  if (!options.repo?.url) {
    throw new Error("createFeedbackHandler requires repo.url");
  }
  if (typeof options.enrich !== "function") {
    throw new Error("createFeedbackHandler requires an enrich function");
  }

  const limits = resolveLimits({
    ...DEFAULT_LIMITS,
    ...options.limits,
    rateLimitMax: options.limits?.rateLimitMax ?? DEFAULT_LIMITS.rateLimitMax,
    rateLimitWindowMs: options.limits?.rateLimitWindowMs ?? DEFAULT_LIMITS.rateLimitWindowMs,
  });
  const limiter = new SlidingWindowLimiter(limits.rateLimitMax, limits.rateLimitWindowMs);
  const seen = new TtlMap<FeedbackHandlerSuccess>(limits.dedupeWindowMs);
  const apiBaseUrl = options.cursorApiBaseUrl ?? "https://api.cursor.com";

  return async function feedbackHandler(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return json({ ok: false, error: "Method not allowed" }, 405);
    }

    const key = clientKey(request);
    if (!limiter.check(key)) {
      return json({ ok: false, error: "Too many feedback reports. Try again later." }, 429);
    }

    const body = await readJsonBody(request, limits.maxBodyBytes);
    if (!body.ok) return json({ ok: false, error: body.error }, body.status);

    const parsed = validatePayload(body.value, limits);
    if (!parsed.ok) return json({ ok: false, error: parsed.error }, 400);

    const existing = seen.get(parsed.payload.eventId);
    if (existing) return json(existing, 200);

    const { payload } = parsed;
    let enrichResult: Awaited<ReturnType<CreateFeedbackHandlerOptions["enrich"]>>;
    try {
      enrichResult = await options.enrich({
        request,
        feedback: {
          eventId: payload.eventId,
          sessionId: payload.sessionId,
          message: payload.message,
          submittedAt: payload.submittedAt,
          screenshotCount: payload.screenshots.length,
        },
        session: payload.session,
      });
    } catch (error) {
      return json(
        {
          ok: false,
          error: error instanceof Error ? error.message : "enrich failed",
        },
        500,
      );
    }

    if (enrichResult && "dispatch" in enrichResult && enrichResult.dispatch === false) {
      const result: FeedbackHandlerSuccess = {
        ok: true,
        dispatched: false,
        feedbackId: payload.eventId,
        reason: enrichResult.reason,
      };
      seen.set(payload.eventId, result);
      return json(result, 202);
    }

    const context =
      enrichResult && "context" in enrichResult ? enrichResult.context : undefined;
    const prompt = buildAgentPrompt({
      feedbackId: payload.eventId,
      payload,
      enrichment: context,
    });

    if (options.dryRun) {
      const result: FeedbackHandlerSuccess = {
        ok: true,
        dispatched: false,
        dryRun: true,
        feedbackId: payload.eventId,
      };
      seen.set(payload.eventId, result);
      return json(result, 202);
    }

    try {
      const dispatched = await dispatchCloudAgent({
        apiKey: options.cursorApiKey,
        apiBaseUrl,
        prompt,
        screenshots: payload.screenshots,
        repoUrl: options.repo.url,
        repoRef: options.repo.ref,
        model: options.model,
        name: options.agentName ?? agentDisplayName(payload.eventId),
        skipReviewerRequest: options.skipReviewerRequest,
      });
      const result: FeedbackHandlerSuccess = {
        ok: true,
        dispatched: true,
        feedbackId: payload.eventId,
        agentId: dispatched.agentId,
        agentUrl: dispatched.agentUrl,
      };
      seen.set(payload.eventId, result);
      return json(result, 202);
    } catch (error) {
      return json(
        {
          ok: false,
          error: error instanceof Error ? error.message : "Failed to dispatch cloud agent",
        },
        502,
      );
    }
  };
}

function json(
  body: FeedbackHandlerSuccess | FeedbackHandlerErrorBody,
  status: number,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
