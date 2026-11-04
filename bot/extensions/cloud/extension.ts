import cursorCloudAgents from "@grok/agent-sdk/extensions/cursor-cloud-agents";
import { targetRepo } from "../../lib/config.js";

// The launch allowlist is the one target repo; launch_fix_agent is the only
// way in, so every brief is redacted and carries the hard rules.
export default cursorCloudAgents({
  cloud: {
    repos: () => [targetRepo()],
    autoCreatePR: true,
    skipReviewerRequest: true,
  },
});
