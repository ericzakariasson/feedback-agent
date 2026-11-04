import type { ToolContext } from "@grok/agent-sdk/tools";

export type LaunchRecord = {
  agentId: string;
  url: string;
  feedbackId: string;
  repo: string;
  launchedAt: string;
};

/** One fix per Slack thread: the thread is the session's continuation key. */
export function threadKey(ctx: ToolContext): string {
  return ctx.session.continuationKey ?? ctx.session.id;
}

function kvKey(ctx: ToolContext): string {
  return `launch:${ctx.session.channelId}:${threadKey(ctx)}`;
}

export async function readLaunch(ctx: ToolContext): Promise<LaunchRecord | undefined> {
  const value = await ctx.host.kv.get(kvKey(ctx));
  return isLaunchRecord(value) ? value : undefined;
}

export async function writeLaunch(ctx: ToolContext, record: LaunchRecord): Promise<void> {
  await ctx.host.kv.put(kvKey(ctx), record);
}

function isLaunchRecord(value: unknown): value is LaunchRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { agentId?: unknown }).agentId === "string"
  );
}
