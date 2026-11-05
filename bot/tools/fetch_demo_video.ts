import { mkdir, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import { z } from "zod";
import { artifactDownloadUrl, listArtifacts } from "../lib/artifacts.js";
import { DEMO_VIDEO_EXTENSIONS, MAX_DEMO_BYTES } from "../lib/config.js";
import { readLaunch } from "../lib/launches.js";

export default defineTool({
  description: prompt`
    Download the demo video the fix agent recorded in this thread into your
    workspace, so you can attach it with \`slack__post-file\`.

    Works only for the agent launch_fix_agent started in this thread. Returns
    \`found: false\` with the agent's artifact list when it saved no video.
  `,
  inputSchema: z.object({}),
  effect: "idempotent",
  dryRunResult: () => ({ found: false, reason: "dry_run" }),
  async execute(_input, ctx) {
    const launch = await readLaunch(ctx);
    if (!launch) {
      return { found: false, reason: "no_launch_in_thread" };
    }
    if (ctx.session.purpose === "eval") {
      return { found: false, reason: "eval_session", agentId: launch.agentId };
    }

    const artifacts = await listArtifacts(launch.agentId);
    const videos = artifacts
      .filter((a) => DEMO_VIDEO_EXTENSIONS.includes(extname(a.absolutePath).toLowerCase()))
      .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
    const video = videos.find((a) => (a.sizeBytes ?? 0) <= MAX_DEMO_BYTES);
    if (!video) {
      return {
        found: false,
        reason: videos.length ? "video_too_large" : "no_video_artifact",
        agentId: launch.agentId,
        artifacts: artifacts.map((a) => a.absolutePath).slice(0, 20),
      };
    }

    const response = await fetch(await artifactDownloadUrl(launch.agentId, video.absolutePath), {
      signal: AbortSignal.timeout(120_000),
    });
    if (!response.ok) throw new Error(`Demo video download failed: HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.byteLength > MAX_DEMO_BYTES) {
      return { found: false, reason: "video_too_large", agentId: launch.agentId, sizeBytes: bytes.byteLength };
    }

    const dir = join(ctx.workspaceDir, "demo");
    await mkdir(dir, { recursive: true });
    const path = join(dir, `${launch.feedbackId}-${basename(video.absolutePath)}`);
    await writeFile(path, bytes);
    return { found: true, path, sizeBytes: bytes.byteLength, source: video.absolutePath, agentId: launch.agentId };
  },
});
