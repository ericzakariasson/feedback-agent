# Privacy & compliance for integrators

`feedback-agent` records a rolling window of first-party session context (URLs, clicks, errors, optional DOM replay, optional screenshots) and can send that to a Cursor cloud agent.

This is **not** a GDPR/CCPA compliance product. You are the data controller for whatever you embed this into.

## What can be captured

| Signal | Default | Notes |
| --- | --- | --- |
| URL history | on | Path + document title |
| Click breadcrumbs | on | Meaningful controls only, labels redacted |
| `window.onerror` / unhandled rejections | on | Message + short stack, redacted |
| `console.error` | off | Enable only if you accept log PII |
| rrweb DOM replay | on | Input masking on; password/email/tel always masked |
| User screenshots | opt-in | Upload / paste / `captureScreenshot()` |
| Auto `viewport.png` | on submit if no user shots | Live page at submit |
| Auto `replay-collage.jpg` | best-effort | Replay frames |
| Identity | never from the browser | Put trusted ids in `enrich` only |

Redaction strips emails, JWTs, bearer tokens, and secret-looking assigns. It will miss things. Do not put secrets in the DOM.

## Consent recipe

Default capture is **on** (current behavior). For production traffic:

```tsx
<FeedbackProvider
  endpoint="/api/feedback"
  capture={{ enabled: hasAnalyticsConsent }}
>
```

Or start enabled and stop later:

```ts
const { setCaptureEnabled } = useFeedback();
setCaptureEnabled(false); // stops recording and clears the in-memory window
```

Do not record before consent if your policy requires it. Disabling capture clears the rolling buffer.

Block sensitive subtrees:

```html
<div data-fw-block>Account number</div>
```

## Retention

The library does not store reports. If you need an audit log, persist in `onAccepted` **before** Cursor dispatch, on your infrastructure, with your retention policy.

Cursor agents and GitHub PRs may retain prompt text and images under Cursor / GitHub terms. Do not put raw identity or screenshots into commits — the default prompt forbids that, but a human should still review PRs.

## Checklist

- [ ] Cookie / privacy notice mentions in-app feedback + session replay
- [ ] Capture gated on consent or authentication
- [ ] `enrich` refuses anonymous / banned users
- [ ] Per-user caps via `store` (not only per-IP)
- [ ] `autoCreatePR: false` until triage exists
- [ ] Sensitive UI marked `data-fw-block`
- [ ] Security contact published (`SECURITY.md`)
