import { createFeedbackHandler } from "feedback-agent/server";

const handler = createFeedbackHandler({
  cursorApiKey: process.env.CURSOR_API_KEY,
  dryRun: process.env.FEEDBACK_DRY_RUN !== "false",
  trustProxy: "x-forwarded-for",
  autoCreatePR: false,
  repo: {
    url: process.env.FEEDBACK_REPO_URL || "https://github.com/example/app",
    ref: process.env.FEEDBACK_REPO_REF || "main",
  },
  async enrich({ request }) {
    const cookies = request.headers.get("cookie") ?? "";
    const signedIn = /(?:^|;\s*)demo_user=1(?:;|$)/.test(cookies);
    if (!signedIn) return { dispatch: false, reason: "unauthenticated" };
    return {
      context: {
        user: { id: "demo-user", plan: "pro" },
      },
    };
  },
});

export const POST = handler;
