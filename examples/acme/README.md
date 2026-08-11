# Acme — recording demo

Quiet invoicing app for a Screen Studio take of feedback-agent.

The Northwind row (`Website refresh`) has a real inline-rename bug: type a new title, click away, it snaps back. Reporting that launches a **real Cursor cloud agent** against this GitHub repo.

```bash
# from the repo root
cp .env.example .env   # if you do not already have one
# set CURSOR_API_KEY, and confirm FEEDBACK_REPO_URL is this repo
npm run example:acme
```

App: [http://127.0.0.1:5175](http://127.0.0.1:5175)

## Before you hit record

1. Create an API key at [Cursor Dashboard → API Keys](https://cursor.com/dashboard/api).
2. Connect **this** GitHub repo to that Cursor account.
3. **Commit and push** `examples/acme` to the branch the handler prints (`repo=...#branch`). The cloud agent clones GitHub — local-only files are invisible to it.
4. Leave `FEEDBACK_DRY_RUN` unset (or anything except `true`). This example is live unless you opt out.

Each send opens a PR if the agent finds the bug. Skip dry-run takes; they will not give you an agent URL.

## Shot

1. Open `/invoices`. Click **Website refresh**, type `Website redesign`, click empty space. It reverts.
2. Feedback → `Renaming an invoice reverts when I click away.` → Send.
3. Terminal prints `dispatched evt_… → https://cursor.com/agents/…`. Cut to that agent, then the PR.

## Dry run

```bash
FEEDBACK_DRY_RUN=true npm run example:acme
```
