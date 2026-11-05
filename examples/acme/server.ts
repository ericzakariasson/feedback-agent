import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { createFeedbackHandler } from "feedback-agent/server";

for (const file of [resolve("../../.env"), resolve(".env")]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    const value = match[2].trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

const dryRun = process.env.FEEDBACK_DRY_RUN === "true";
const apiKey = process.env.CURSOR_API_KEY;
const repoUrl =
  process.env.FEEDBACK_REPO_URL || "https://github.com/ericzakariasson/feedback-agent";
const repoRef = resolveRepoRef();

if (!dryRun && !apiKey) {
  console.error(
    "examples/acme launches a real Cursor cloud agent.\n" +
      "Set CURSOR_API_KEY in .env (repo root or examples/acme/), or FEEDBACK_DRY_RUN=true.",
  );
  process.exit(1);
}

const handler = createFeedbackHandler({
  cursorApiKey: apiKey || "dev-not-set",
  dryRun,
  autoCreatePR: true,
  skipReviewerRequest: true,
  repo: { url: repoUrl, ref: repoRef },
  limits: { rateLimitMax: 20 },
  async enrich() {
    return {
      context: {
        product: "Acme",
        appPath: "examples/acme",
        user: { id: "ellis", plan: "pro" },
      },
    };
  },
  onError(error, context) {
    console.error(`handler error (${context.stage})`, error);
  },
});

const app = new Hono();
app.post("/api/feedback", async (c) => {
  const response = await handler(c.req.raw);
  const copy = response.clone();
  try {
    const body = (await copy.json()) as {
      ok?: boolean
      feedbackId?: string
      dispatched?: boolean
      agentId?: string
      agentUrl?: string
      dryRun?: boolean
      error?: string
    };
    writeFileSync(resolve(".last-dispatch.json"), JSON.stringify({ ...body, at: new Date().toISOString() }, null, 2));
    if (body.agentUrl) {
      console.log(`dispatched ${body.feedbackId} → ${body.agentUrl}`);
    } else if (body.ok) {
      console.log(`accepted ${body.feedbackId} dispatched=${body.dispatched} dryRun=${body.dryRun}`);
    } else {
      console.error(`feedback failed: ${body.error}`);
    }
  } catch (error) {
    console.error("could not read feedback response", error);
  }
  return response;
});
app.get("/api/health", (c) =>
  c.json({ ok: true, dryRun, repoUrl, repoRef }),
);

const port = Number(process.env.PORT || 8789);
serve({ fetch: app.fetch, port, hostname: "127.0.0.1" });
console.log(
  `acme handler http://127.0.0.1:${port}  dispatch=${dryRun ? "dry-run" : "LIVE"}  repo=${repoUrl}#${repoRef}`,
);

function resolveRepoRef() {
  if (process.env.FEEDBACK_REPO_REF) return process.env.FEEDBACK_REPO_REF;
  try {
    const ref = execSync("git rev-parse --abbrev-ref HEAD", {
      cwd: resolve("../.."),
      encoding: "utf8",
    }).trim();
    if (ref && ref !== "HEAD") return ref;
  } catch {
    /* ignore */
  }
  return "main";
}
