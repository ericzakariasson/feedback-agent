import { slackChannel } from "@grok/agent-sdk/channels/slack";

// Reads FEEDBACK_AGENT_SLACK_BOT_TOKEN and FEEDBACK_AGENT_SLACK_APP_TOKEN.
export default slackChannel({
  envPrefix: "FEEDBACK_AGENT",
  reply: {
    mode: "agentic",
    cards: { display: "plan", title: "Bug fix" },
  },
  suggestedPrompts: [
    {
      title: "Report a bug",
      message: "Renaming an invoice reverts to the old title when I click away. Steps: open /invoices, click 'Website refresh', type a new name, click elsewhere.",
    },
  ],
});
