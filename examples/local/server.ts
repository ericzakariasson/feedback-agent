import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
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

const dryRun = process.env.FEEDBACK_DRY_RUN !== "false";

const handler = createFeedbackHandler({
  cursorApiKey: process.env.CURSOR_API_KEY || "dev-not-set",
  repo: {
    url: process.env.FEEDBACK_REPO_URL || "https://github.com/example/app",
    ref: process.env.FEEDBACK_REPO_REF || "main",
  },
  dryRun,
  async enrich({ request, feedback }) {
    const demoUser = request.headers.get("x-demo-user");
    if (demoUser === "skip") return { dispatch: false, reason: "demo skip" };
    return {
      context: {
        user: { id: demoUser || "local-dev", plan: "dev" },
        note: "Example enrichment. Replace with auth + domain lookups.",
        feedbackPreview: feedback.message.slice(0, 80),
      },
    };
  },
});

const app = new Hono();
app.use(
  "*",
  cors({
    origin: [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5174",
    ],
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["content-type", "x-demo-user"],
  }),
);
app.post("/api/feedback", async (c) => {
  const request = c.req.raw;
  try {
    const body = (await request.clone().json()) as {
      message?: string
      screenshots?: Array<{ name?: string }>
      session?: { replay?: { eventCount?: number; truncated?: boolean; events?: unknown[] } }
    };
    const replay = body.session?.replay;
    const dump = {
      savedAt: new Date().toISOString(),
      message: body.message,
      screenshotNames: body.screenshots?.map((shot) => shot.name) ?? [],
      replay: summarizeReplay(replay),
    };
    writeFileSync(resolve(".last-feedback.json"), JSON.stringify(dump, null, 2));
    writeFileSync(resolve(".last-replay-events.json"), JSON.stringify(replay?.events ?? [], null, 2));
    console.log(
      `saved last feedback dump (${replay?.events?.length ?? 0} rrweb events, truncated=${replay?.truncated ?? false})`,
    );
  } catch (error) {
    console.log("could not dump feedback payload", error);
  }
  return handler(request);
});
app.get("/health", (c) => c.json({ ok: true, dryRun }));
app.get("/api/health", (c) => c.json({ ok: true, dryRun }));

const port = Number(process.env.PORT || 8788);
serve({ fetch: app.fetch, port, hostname: "127.0.0.1" });
console.log(`feedback handler listening on http://127.0.0.1:${port} (dryRun=${dryRun})`);

function summarizeReplay(replay?: {
  eventCount?: number
  truncated?: boolean
  events?: unknown[]
}) {
  const events = Array.isArray(replay?.events) ? replay.events : [];
  const types: Record<string, number> = {};
  const sources: Record<string, number> = {};
  const eventTypeNames: Record<number, string> = {
    0: "DomContentLoaded",
    1: "Load",
    2: "FullSnapshot",
    3: "IncrementalSnapshot",
    4: "Meta",
    5: "Custom",
    6: "Plugin",
    7: "Asset",
  };
  const sourceNames: Record<number, string> = {
    0: "Mutation",
    1: "MouseMove",
    2: "MouseInteraction",
    3: "Scroll",
    4: "ViewportResize",
    5: "Input",
    6: "TouchMove",
    7: "MediaInteraction",
    8: "StyleSheetRule",
    9: "CanvasMutation",
    10: "Font",
    11: "Log",
    12: "Drag",
    13: "StyleDeclaration",
    14: "Selection",
    15: "AdoptedStyleSheet",
    16: "CustomElement",
  };
  const preview = events.slice(0, 12).map(previewEvent);
  for (const event of events) {
    if (!event || typeof event !== "object" || !("type" in event)) continue;
    const type = Number((event as { type: number }).type);
    const typeName = eventTypeNames[type] ?? String(type);
    types[typeName] = (types[typeName] ?? 0) + 1;
    if (type === 3) {
      const source = Number((event as { data?: { source?: number } }).data?.source);
      const sourceName = sourceNames[source] ?? String(source);
      sources[sourceName] = (sources[sourceName] ?? 0) + 1;
    }
  }
  return {
    eventCount: replay?.eventCount ?? events.length,
    serializedEvents: events.length,
    truncated: replay?.truncated ?? false,
    types,
    incrementalSources: sources,
    preview,
  };
}

function previewEvent(event: unknown) {
  if (!event || typeof event !== "object") return event;
  const value = event as {
    type?: number
    timestamp?: number
    data?: { source?: number; href?: string; width?: number; height?: number; node?: { childNodes?: unknown[] } }
  };
  if (value.type === 2) {
    return {
      type: "FullSnapshot",
      timestamp: value.timestamp,
      childNodes: value.data?.node?.childNodes?.length ?? 0,
    };
  }
  if (value.type === 4) {
    return {
      type: "Meta",
      timestamp: value.timestamp,
      href: value.data?.href,
      width: value.data?.width,
      height: value.data?.height,
    };
  }
  if (value.type === 3) {
    return {
      type: "IncrementalSnapshot",
      timestamp: value.timestamp,
      source: value.data?.source,
      data: summarizeIncremental(value.data),
    };
  }
  return { type: value.type, timestamp: value.timestamp };
}

function summarizeIncremental(data: unknown) {
  if (!data || typeof data !== "object") return data;
  const value = data as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (Array.isArray(item)) out[key] = item.length;
    else out[key] = item;
  }
  return out;
}
