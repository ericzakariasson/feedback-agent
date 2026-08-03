import type { ScreenshotPayload } from "../shared/types";
import type { DispatchResult } from "./types";

export async function dispatchCloudAgent(input: {
  apiKey: string
  apiBaseUrl: string
  prompt: string
  screenshots: ScreenshotPayload[]
  repoUrl: string
  repoRef?: string
  model?: string
  name?: string
  skipReviewerRequest?: boolean
}): Promise<DispatchResult> {
  const images = input.screenshots.slice(0, 5).map((shot) => ({
    data: shot.data,
    mimeType: shot.mimeType,
    ...(shot.width && shot.height
      ? { dimension: { width: shot.width, height: shot.height } }
      : {}),
  }));

  const body: Record<string, unknown> = {
    prompt: {
      text: input.prompt,
      ...(images.length ? { images } : {}),
    },
    repos: [
      {
        url: input.repoUrl,
        ...(input.repoRef ? { startingRef: input.repoRef } : {}),
      },
    ],
    autoCreatePR: true,
    ...(input.skipReviewerRequest ? { skipReviewerRequest: true } : {}),
    ...(input.name ? { name: input.name } : {}),
    ...(input.model ? { model: { id: input.model } } : {}),
  };

  const response = await fetch(`${input.apiBaseUrl.replace(/\/$/, "")}/v1/agents`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${input.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = (await response.json().catch(() => null)) as {
    agent?: { id?: string; url?: string; latestRunId?: string }
    run?: { id?: string }
    error?: { message?: string }
    message?: string
  } | null;

  if (!response.ok || !json?.agent?.id) {
    const message =
      json?.error?.message || json?.message || `Cursor API error (${response.status})`;
    throw new Error(message);
  }

  return {
    agentId: json.agent.id,
    agentUrl: json.agent.url,
    runId: json.run?.id ?? json.agent.latestRunId,
  };
}
