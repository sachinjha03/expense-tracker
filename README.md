# Wedding Expense Tracker

A shared, append-only wedding expense ledger. Enter the shared access code at the hosted site to view the expense history, add entries, and see overall and individual INR totals.

The Worker in `server/worker.mjs` uses a Cloudflare D1 binding named `DB`. Apply the SQL in `drizzle` in order and set the server-side secret `LEDGER_ACCESS_CODE` before deploying. Use `node scripts/build.mjs` with the Sites hosting manifest to build a deployable Worker. Keep secret values out of source control.
