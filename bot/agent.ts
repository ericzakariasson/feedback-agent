import { defineAgent } from "@grok/agent-sdk";

export default defineAgent({
  description: "Turns bug reports in Slack into a Cursor cloud agent run that fixes the bug, opens a PR and records a demo.",
  // Only authored tools, extension tools and Slack tools; no shell or file edits on the host.
  tools: [],
  hosting: {
    egressDomains: [
      // Cloud agents API: launches and the demo video's artifact listing.
      "api.cursor.com",
      // Presigned artifact download URLs on Cursor's object storage.
      "*.amazonaws.com",
    ],
    secretNames: ["FEEDBACK_REPO_URL", "FEEDBACK_REPO_REF"],
  },
});
