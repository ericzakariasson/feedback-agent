# Changelog

## 1.0.0 — 2026-11-04

Rewritten as an Agent SDK Slack bot. The React widget and `createFeedbackHandler` server library are gone; the npm package is no longer published from this repo.

### Added

- Slack bot (`bot/`) on `@grok/agent-sdk@0.6.0`: native Slack channel, `slack-communication` tools and the `cursor-cloud-agents` extension
- `launch_fix_agent`: one cloud agent per Slack thread that reproduces the bug, fixes it, opens a PR and records a demo video
- `fetch_demo_video`: downloads the agent's demo video from the Cursor artifacts API so the bot posts it in the thread
- Triage evals under `evals/`
- `demo-app/` (formerly `examples/acme`) as the default target, with `AGENTS.md` for cloud agents

### Kept

- Untrusted-input hard rules, redaction of emails and credentials, one run per report, feedback id in the PR


## 0.3.0 — 2026-08-06

Preview cut that matches this repository. Previous npm `0.1.0` did not include the prompt hook or the hardening below.

### Added

- `prompt` hook and exported `buildAgentPrompt`
- `FeedbackStore` + `MemoryFeedbackStore` for multi-instance rate limit / dedupe
- `trustProxy` for client IP (`false` by default; `"cf"` / `"x-forwarded-for"` / `true`)
- `autoCreatePR` option (default `true`)
- `onAccepted`, `onEvent`, and `onError` hooks
- Capture consent: `capture.enabled` and `useFeedback().setCaptureEnabled`
- `useFeedback().result` exposes dispatch metadata (`dryRun`, `dispatched`, `agentUrl`, …)
- GitHub Actions CI (Node 18 + 24), example typecheck, Playwright smoke, React 18 job
- Next.js App Router example under `examples/next`
- `CHANGELOG.md`, `SECURITY.md`, `docs/privacy.md`

### Changed

- Enrich / prompt / Cursor failures no longer return internal messages to the browser
- Session validation builds a clean bundle and drops unknown fields
- Handler limits can override prompt, enrichment, breadcrumb, and dedupe caps
- `cursorApiKey` is optional when `dryRun: true`
- Default widget thanks copy distinguishes dry-run / skipped / dispatched
- Local demo binds Vite to `127.0.0.1:5174`

### Fixed

- Example “Capture page & open” referenced an undefined setter
