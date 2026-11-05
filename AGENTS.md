# Notes for coding agents

This repo holds two things:

- `bot/` and `evals/`: the Slack feedback bot, an Agent SDK project. Check it with `npm install && npm run check`.
- `demo-app/`: a small Vite + React invoicing app that the bot's cloud agents fix by default.

## Running the demo app

```bash
cd demo-app
npm install
npm run dev   # serves http://127.0.0.1:5175/invoices
```

Typecheck with `npm run typecheck` in `demo-app/`. There is no test harness there; verify fixes in the browser.

## Recording a demo of a fix

When a task asks for a demo video, record the fixed behavior in the browser with the same steps as the reproduction, keep it under 60 seconds, and save it as an `.mp4` under `/opt/cursor/artifacts/`. The feedback bot downloads the newest video from there and posts it in Slack, so do not leave stale videos in that folder.
