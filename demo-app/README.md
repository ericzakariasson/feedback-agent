# Acme demo app

A small invoicing app with one real bug, used as the default target for the feedback bot.

The Northwind row (`Website refresh`) has an inline rename bug: click the title, type a new one, click away, and the old title snaps back. Pressing Enter does the same.

```bash
cd demo-app
npm install
npm run dev   # http://127.0.0.1:5175/invoices
```

Report it in Slack, for example: `@Feedback Agent renaming an invoice in the Acme demo app reverts when I click away`.

The cloud agent clones GitHub, not your working tree, so this folder must be pushed to the branch the bot launches from (`main` by default).
