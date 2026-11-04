import { cursorExternalApiUrl, resolveApiKeySync } from "@grok/agent-sdk";

/**
 * Cursor Cloud Agents artifacts API: files the agent saved under
 * /opt/cursor/artifacts. Listing returns paths; downloading returns a
 * short-lived presigned URL on Cursor's object storage.
 */
export type CloudArtifact = { absolutePath: string; sizeBytes?: number; updatedAt?: string };

const API_VERSIONS = ["v1", "v0"] as const;

function apiKey(): string {
  const key = resolveApiKeySync();
  if (!key) throw new Error("No Cursor credential: run `agent-sdk login` or set CURSOR_API_KEY.");
  return key.apiKey;
}

async function getJson(path: string): Promise<unknown> {
  const key = apiKey();
  let lastError = "";
  for (const version of API_VERSIONS) {
    const response = await fetch(`${cursorExternalApiUrl()}/${version}${path}`, {
      headers: { authorization: `Bearer ${key}`, accept: "application/json" },
      signal: AbortSignal.timeout(30_000),
    });
    if (response.ok) return response.json();
    lastError = `${version}${path.split("?")[0]} returned ${response.status}`;
    if (response.status !== 404) break;
  }
  throw new Error(`Cursor artifacts API: ${lastError}`);
}

export async function listArtifacts(agentId: string): Promise<CloudArtifact[]> {
  const body = await getJson(`/agents/${encodeURIComponent(agentId)}/artifacts`);
  const items = (body as { artifacts?: unknown }).artifacts;
  if (!Array.isArray(items)) return [];
  return items.flatMap((item): CloudArtifact[] => {
    const record = item as Record<string, unknown>;
    const path = record.absolutePath ?? record.path;
    if (typeof path !== "string") return [];
    return [{
      absolutePath: path,
      sizeBytes: typeof record.sizeBytes === "number" ? record.sizeBytes : undefined,
      updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : undefined,
    }];
  });
}

export async function artifactDownloadUrl(agentId: string, absolutePath: string): Promise<string> {
  const query = new URLSearchParams({ path: absolutePath });
  const body = await getJson(`/agents/${encodeURIComponent(agentId)}/artifacts/download?${query}`);
  const url = (body as { url?: unknown }).url;
  if (typeof url !== "string" || !url.startsWith("https://")) {
    throw new Error("Cursor artifacts API returned no download URL.");
  }
  return url;
}
