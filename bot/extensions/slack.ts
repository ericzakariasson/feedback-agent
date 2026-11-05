import slackCommunication from "@grok/agent-sdk/extensions/slack-communication";

export default slackCommunication({
  tone: "Short and plain, like a teammate. Lead with the outcome, then the link. No headers, no emoji, at most three bullets.",
});
