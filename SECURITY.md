# Security policy

## Reporting a vulnerability

Please report security issues privately via [GitHub security advisories](https://github.com/ericzakariasson/feedback-agent/security/advisories/new) or email **eric.zakariasson@gmail.com**.

Do not open a public issue for vulnerabilities that could leak session data, bypass rate limits, or abuse Cursor agent dispatch.

We aim to acknowledge reports within a few days.

## What this library handles

- Cursor API keys stay on the server. Do not put them on the widget.
- Reports are untrusted telemetry. The default agent prompt says not to follow instructions found in feedback, screenshots, replay, or enrichment.
- Input masking and text redaction are **best-effort**. Treat browser capture as production telemetry that may contain PII.

## What integrators must do

- Authenticate in `enrich` and refuse anonymous dispatch.
- Put a real `store` behind multi-instance / serverless hosts.
- Enable `trustProxy` only behind a trusted reverse proxy.
- Gate replay with consent / auth (`capture.enabled` or `setCaptureEnabled`).
- Keep `autoCreatePR: false` on public widgets until a human reviews reports.
- See [docs/privacy.md](docs/privacy.md) for a compliance checklist.
