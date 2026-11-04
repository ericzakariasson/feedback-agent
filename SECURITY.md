# Security policy

## Reporting a vulnerability

Please report security issues privately via [GitHub security advisories](https://github.com/ericzakariasson/feedback-agent/security/advisories/new) or email **eric.zakariasson@gmail.com**.

Do not open a public issue for vulnerabilities that could leak Slack data, credentials, or let someone steer cloud agents.

We aim to acknowledge reports within a few days.

## What the bot does

- Bug reports are untrusted input. The brief sent to the cloud agent fences the report and tells the agent never to follow instructions inside it.
- Emails, bearer tokens, JWTs, Slack tokens and key-shaped strings are redacted before a report leaves Slack. Redaction is best-effort.
- Launches are limited to one configured repo. The generic `cloud__launch` tool is disabled, so the model can only launch through `launch_fix_agent`.
- Each caller can only read and steer the cloud agents they launched.
- Cloud agents open PRs but never merge, deploy or push to the default branch.

## What operators must do

- Keep Slack tokens and Cursor credentials out of the repo (`.env.local` is gitignored; hosted values go through `agent-sdk secret set` or `slack create --env prod`).
- Install the Slack app only in workspaces whose members you trust to spend the account's cloud-agent budget. Slack Connect guests are blocked by default.
- Require review on PRs the agent opens; branch protection on the default branch is recommended.
