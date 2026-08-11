# feedback-agent demo script

Shot list for a **Screen Studio** recording of the live Acme app in `examples/acme`. A real Cursor cloud agent investigates the report.

Runtime target: **~50 seconds**. Hard cap **60**. Record at 1920×1080.

The Remotion project in `demo/` is leftover from an earlier drawn cut. Do not film that.

## One-liner

Stuck in the product. Report it in place. Agent gets the session, opens a PR, owner approves.

## What this video has to prove

1. Feedback is in-product.
2. The report carries the page and what they just did — not just a sentence.
3. The agent works in the real repo.
4. A human still approves. We do not merge.

## How we make it

`npm run example:acme` → [http://127.0.0.1:5175](http://127.0.0.1:5175). Real widget, real session capture, real `POST /api/feedback`, real Cursor cloud agent, real PR.

The bug lives in `examples/acme/src/invoices/InvoiceRow.tsx`. Push that file before you record — the agent clones GitHub, not your working tree.

See [`examples/acme/README.md`](../examples/acme/README.md) for API key + repo setup.

## Product on screen

**Name:** Acme — quiet invoicing app
**Screen:** Invoice list. One row we care about: `Website refresh / Northwind · INV-0142`.
**The fail:** Inline rename. They type a new title, click away, the old title snaps back.

No plan picker, no Settings. Wordmark + a short list. No demo banners, no Inspect, no fake emails.

## Look

x.ai design language, **light mode**: stark white canvas (`#FCFCFC`), near-black ink, alpha-black hierarchy, hairline borders, letterspaced mono labels, dot-grid canvas behind the packet / agent / end-card beats.

- **Acme**: black "A" monogram on a square, alpha-tinted avatars and status chips, white rename input with black focus border.
- **Widget**: the real widget's light scheme — white panel, black Send pill with white text.
- **Agent console + end card**: white panel, docs-style code colors (GitHub-light green/red diff tints, blue file links, dark-green prompt).
- **Slack stays Slack** (light). It's a real product being depicted.
- The replay collage stays a dark `#111` composite on purpose — that's what the library's generated `replay-collage.jpg` actually looks like, and it reads as a real attached image against the white card.

## Compositions / beat sheet

Timings live in `BEATS` in `demo/src/script.ts`.

| Comp | Time | What |
| --- | --- | --- |
| `Arrive` | 0:00–0:04 | Invoice list cascades in, cursor drifts in. Establishing shot. |
| `Confusion` | 0:04–0:11 | Hover the title → click → inline edit (camera pushes in on the row) → type `Website redesign` at full speed → pull back out → click empty space → snaps back to `Website refresh`. Hover it again, drift off. No second try. No crash toast. |
| `Report` | 0:11–0:18.5 | Cursor to **Feedback**. Sheet in. Type full speed: `Renaming an invoice reverts when I click away.` Send. Thanks view is just a big "Thanks, we got it" + `Reference: evt_7f3a`. Cut. |
| `Packet` | 0:18.5–0:26.5 | What the agent receives, as a loose floating paper stack: `MESSAGE · what they wrote`, `SCREENSHOT · viewport.png · 1440×900 · captured at send`, `ACTIVITY · breadcrumbs · last 5 min · redacted`, `REPLAY · replay-collage.jpg · 4 frames · last 5 min` (idle → rename → blur → reverted). In the last two seconds the agent console peeks up from the bottom edge — pulsing green dot, `cursor agent`, the `evt_7f3a` chip, `acme/app · fix/invoice-rename-revert` — and the cards drop into its header one by one. The console rises through the cut. |
| `Agent` | 0:26.5–0:41.5 | Same console, now full frame. Log fills line by line (read feedback → replay summary → `rg -n "setTitle"` → open `InvoiceRow.tsx:39` → found it), the buggy `handleBlur` lines flag red, then flip to a green `persist()` diff. Checks line, then the final log line: `opened PR #184 · includes evt_7f3a` — and the console pushes in on it. |
| `Owner` | 0:41.5–0:46.5 | Slack `#feedback`, zoomed ~2.4× on the bot message with a slow push-in: **Approve** / **Open PR**. Click Approve (sound). Buttons swap for `✓ Approved by Maya · 2:14 PM`. The beat ends on the approved state. |
| `EndCard` | 0:46.5–0:52.5 | Bare `$ npm i feedback-agent` typed at 72px mono on the dot-grid canvas, key ticks, GitHub URL fades in under. |

Cut from earlier drafts: the `Workflow` diagram beat (boxes with a traveling dot), all burned-in captions, and the smash cut back to the fixed app after Approve.

## Shared props (single source)

Everything is driven from `demo` in `demo/src/script.ts` so the typed sentence, feedback id, filenames, and diff stay in sync.

```ts
export const demo = {
  app: "Acme",
  invoiceClient: "Northwind",
  invoiceTitle: "Website refresh",
  invoiceTitleNext: "Website redesign",
  message: "Renaming an invoice reverts when I click away.",
  feedbackId: "evt_7f3a",
  file: "InvoiceRow.tsx",
  pr: 184,
  slackChannel: "#feedback",
  owner: "Maya",
  typeCps: 32,
};
```

## Sound

- **Click** on title, click-away, Feedback, Send, Approve.
- **Keys** on the invoice rename, the feedback box, and the end-card command. Sparse, not a storm.
- **No music.** Easy to drop a bed under the export later.

## Spoken track

**None.** The clicks/keys above are the whole soundtrack.

## What we will not show

- A real browser, real widget, or real agent recording
- API keys, raw rrweb JSON, real PII
- Auto-merge
- Vendor comparisons
- Inspect / debug UI

## Owner ping — Slack

We draw a Slack message with inline buttons. (The library does not send Slack; this is the host wiring `onEvent` / the PR webhook. One honest beat, not a feature claim.)

**Chrome:** Slack, channel `#feedback`, bot **Acme**. No sidebar tour — the zoomed message is the frame.

**Incoming**

```
Acme APP  2:14 PM
Feedback evt_7f3a is ready to review

Renaming an invoice reverts when I click away.

PR #184 · acme/app · InvoiceRow.tsx

[ Approve ]   [ Open PR ]
```

- **Approve** — primary green button. This is the click.
- **Open PR** — default. Link-style, we do not click it.
- No Dismiss. Two buttons only.

**After click:** buttons crossfade to the context line `✓ Approved by Maya · 2:14 PM`, and the beat holds there until the end card.

Block Kit this is standing in for (Remotion paints it, we do not post it):

```json
{
  "text": "Feedback evt_7f3a is ready to review",
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Feedback `evt_7f3a` is ready to review*\n_Renaming an invoice reverts when I click away._\nPR <https://github.com/acme/app/pull/184|#184> · `acme/app` · `InvoiceRow.tsx`"
      }
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "style": "primary",
          "text": { "type": "plain_text", "text": "Approve" },
          "action_id": "approve"
        },
        {
          "type": "button",
          "text": { "type": "plain_text", "text": "Open PR" },
          "url": "https://github.com/acme/app/pull/184",
          "action_id": "open_pr"
        }
      ]
    }
  ]
}
```

## Locked

- Screen Studio of `examples/acme`. No VO. Live widget + live Cursor agent.
- Acme is light, quiet, full-bleed (no fake Mac window). Slack / GitHub are the real products if you cut to them.
- Approve means approve, not merge.
- End card: `npm i feedback-agent`.

## Working with it

- `npm run example:acme` — Acme on [http://127.0.0.1:5175](http://127.0.0.1:5175). Terminal prints the agent URL after Send.
- Set `CURSOR_API_KEY` in `.env`. Commit and push `examples/acme` first.
- Screen Studio records the live app, then the agent URL, then the PR.
