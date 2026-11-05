# Next.js example

App Router integration for `feedback-agent`.

```bash
npm run build --prefix ../..
npm install
npm run dev
```

Open http://localhost:3005, sign in, then send feedback. Dry-run stays on until `FEEDBACK_DRY_RUN=false` and a real `CURSOR_API_KEY` are set.

Session capture starts only after the demo sign-in cookie is set (`capture.enabled`).
