import { DEFAULT_LIMITS } from "../shared/limits";
import type {
  FeedbackHandlerErrorBody,
  FeedbackHandlerSuccess,
} from "../shared/types";
import { dispatchCloudAgent } from "./cursor";
import { MemoryFeedbackStore } from "./memory";
import { agentDisplayName, buildAgentPrompt } from "./prompt";
import type { CreateFeedbackHandlerOptions, FeedbackHandlerEventName } from "./types";
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

  const limits = resolveLimits(options.limits);
  const store = options.store ?? new MemoryFeedbackStore();
  const apiBaseUrl = options.cursorApiBaseUrl ?? "https://api.cursor.com";
  const trustProxy = options.trustProxy ?? false;
  const autoCreatePR = options.autoCreatePR ?? true;

  const emit = (name: FeedbackHandlerEventName, data: Record<string, unknown> = {}) => {
    try {
      options.onEvent?.(name, data);
    } catch {
      /* host observability must not break dispatch */
    }
  };

  return async function feedbackHandler(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return json({ ok: false, error: "Method not allowed" }, 405);
    }

    const key = clientKey(request, trustProxy);
    if (!(await store.checkRateLimit(key, {
      max: limits.rateLimitMax,
      windowMs: limits.rateLimitWindowMs,
    }))) {
      emit("rate_limited", { key });
      return json({ ok: false, error: "Too many feedback reports. Try again later." }, 429);
    }

    const body = await readJsonBody(request, limits.maxBodyBytes);
    if (!body.ok) {
      if (body.status === 400 || body.status === 413) emit("invalid", { error: body.error });
      return json({ ok: false, error: body.error }, body.status);
    }

    const parsed = validatePayload(body.value, limits);
    if (!parsed.ok) {
      emit("invalid", { error: parsed.error });
      return json({ ok: false, error: parsed.error }, 400);
    }

    const existing = await store.getDedupe(parsed.payload.eventId);
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
      options.onError?.(error, { stage: "enrich" });
      return json({ ok: false, error: "Internal error" }, 500);
    }

    if (enrichResult && "dispatch" in enrichResult && enrichResult.dispatch === false) {
      const result: FeedbackHandlerSuccess = {
        ok: true,
        dispatched: false,
        feedbackId: payload.eventId,
        reason: enrichResult.reason,
      };
      emit("skipped", { feedbackId: payload.eventId, reason: enrichResult.reason });
      await store.setDedupe(payload.eventId, result, limits.dedupeWindowMs);
      return json(result, 202);
    }

    const context =
      enrichResult && "context" in enrichResult ? enrichResult.context : undefined;
    const defaultPrompt = buildAgentPrompt({
      feedbackId: payload.eventId,
      payload,
      enrichment: context,
      limits,
    });

    let promptText = defaultPrompt;
    if (options.prompt) {
      try {
        promptText = await options.prompt({
          feedbackId: payload.eventId,
          message: payload.message,
          submittedAt: payload.submittedAt,
          session: payload.session,
          enrichment: context,
          defaultPrompt,
        });
      } catch (error) {
        options.onError?.(error, { stage: "prompt" });
        return json({ ok: false, error: "Internal error" }, 500);
      }
    }

    if (typeof promptText !== "string" || !promptText.trim()) {
      return json({ ok: false, error: "Internal error" }, 500);
    }
    if (promptText.length > limits.maxPromptChars) {
      promptText = promptText.slice(0, limits.maxPromptChars);
    }

    try {
      await options.onAccepted?.({ payload, enrichment: context });
    } catch (error) {
      options.onError?.(error, { stage: "accepted" });
      return json({ ok: false, error: "Internal error" }, 500);
    }
    emit("accepted", { feedbackId: payload.eventId });

    if (options.dryRun) {
      const result: FeedbackHandlerSuccess = {
        ok: true,
        dispatched: false,
        dryRun: true,
        feedbackId: payload.eventId,
      };
      emit("dry_run", { feedbackId: payload.eventId });
      await store.setDedupe(payload.eventId, result, limits.dedupeWindowMs);
      return json(result, 202);
    }

    try {
      const dispatched = await dispatchCloudAgent({
        apiKey: options.cursorApiKey!,
        apiBaseUrl,
        prompt: promptText,
        screenshots: payload.screenshots,
        repoUrl: options.repo.url,
        repoRef: options.repo.ref,
        model: options.model,
        name: options.agentName ?? agentDisplayName(payload.eventId),
        skipReviewerRequest: options.skipReviewerRequest,
        autoCreatePR,
      });
      const result: FeedbackHandlerSuccess = {
        ok: true,
        dispatched: true,
        feedbackId: payload.eventId,
        agentId: dispatched.agentId,
        agentUrl: dispatched.agentUrl,
      };
      emit("dispatched", {
        feedbackId: payload.eventId,
        agentId: dispatched.agentId,
      });
      await store.setDedupe(payload.eventId, result, limits.dedupeWindowMs);
      return json(result, 202);
    } catch (error) {
      options.onError?.(error, { stage: "dispatch" });
      emit("upstream_failed", { feedbackId: payload.eventId });
      return json({ ok: false, error: "Upstream dispatch failed" }, 502);
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
