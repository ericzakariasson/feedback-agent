import { prompt } from "@grok/agent-sdk";
import { launchCloudAgent } from "@grok/agent-sdk/extensions/cursor-cloud-agents";
import { defineTool } from "@grok/agent-sdk/tools";
import { z } from "zod";
import { buildBrief, feedbackId } from "../lib/brief.js";
import { targetRepo } from "../lib/config.js";
import { readLaunch, threadKey, writeLaunch } from "../lib/launches.js";

export default defineTool({
  description: prompt`
    Launch a Cursor cloud agent that reproduces a reported bug, fixes it,
    opens a pull request, and records a demo video of the fix.

    Call it once per Slack thread, only for a concrete bug report. Pass the
    reporter's words verbatim in \`report\` and your structured reading of
    them in the other fields. Calling it again in the same thread returns the
    agent that is already working instead of launching another.

    You are woken with a "[cloud agent stopped]" message when the agent
    finishes; you do not need to poll.
  `,
  inputSchema: z.object({
    title: z.string().min(3).max(120).describe("One-line bug summary, e.g. 'Invoice rename reverts on blur'."),
    report: z.string().min(1).describe("The reporter's message(s), verbatim."),
    steps: z.array(z.string()).default([]).describe("Reproduction steps, if the report gives or implies them."),
    expected: z.string().optional(),
    actual: z.string().optional(),
    where: z.string().optional().describe("Page, URL, or feature where it happens."),
  }),
  effect: "write",
  dryRunResult: (bug) => ({ launched: false, reason: "dry_run", title: bug.title }),
  async execute(bug, ctx) {
    const existing = await readLaunch(ctx);
    if (existing) {
      return { launched: false, reason: "already_launched", ...existing };
    }

    const id = feedbackId(threadKey(ctx));
    const repo = targetRepo();
    const brief = buildBrief({ id, bug });

    if (ctx.session.purpose === "eval") {
      return { launched: false, reason: "eval_session", feedbackId: id, repo: repo.url, brief };
    }

    const launch = await launchCloudAgent(ctx, {
      prompt: brief,
      name: `Fix: ${bug.title}`.slice(0, 80),
      cloud: { repos: [repo], autoCreatePR: true, skipReviewerRequest: true },
    });

    const record = {
      agentId: launch.agentId,
      url: launch.url,
      feedbackId: id,
      repo: repo.url,
      launchedAt: new Date().toISOString(),
    };
    await writeLaunch(ctx, record);
    return { launched: true, status: launch.status, watching: launch.watching, ...record };
  },
});
