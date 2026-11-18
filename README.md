# Wedding Expense Tracker

A shared wedding expense ledger backed by Cloudflare D1. Anyone with the site link can view expenses, add entries, and see overall and individual INR totals. Use **Sachin · Owner** to unlock editing with the owner password.

The Worker in `server/worker.mjs` uses a D1 binding named `DB`. Apply the SQL in `drizzle` in order and configure the server-side secret `OWNER_PASSWORD` before deploying. Run `node scripts/build.mjs` with the Sites hosting manifest to build the Worker.
