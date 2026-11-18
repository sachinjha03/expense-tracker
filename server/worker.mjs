import { assets } from './assets.mjs';

const payers = ['Sachin', 'Vikas', 'Manisha', 'Basuki'];
const headers = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};
const json = (data, status = 200) => Response.json(data, { status, headers });
const error = (message, status) => json({ ok: false, message }, status);

async function authorized(value, expected) {
  if (typeof value !== 'string' || !expected || value.length !== expected.length) return false;
  const encode = new TextEncoder();
  const digest = async text => new Uint8Array(await crypto.subtle.digest('SHA-256', encode.encode(text)));
  const [actual, secret] = await Promise.all([digest(value), digest(expected)]);
  return actual.reduce((diff, byte, i) => diff | (byte ^ secret[i]), 0) === 0;
}

async function expenses(request, env) {
  if (request.method !== 'POST') return error('Method not allowed.', 405);
  if (request.headers.get('Sec-Fetch-Site') === 'cross-site') return error('Invalid origin.', 403);
  const raw = await request.text();
  if (raw.length > 8192) return error('Request is too large.', 413);
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    return error('Invalid request.', 400);
  }
  if (!await authorized(input?.code, env.LEDGER_ACCESS_CODE)) return error('Incorrect access code.', 401);
  if (input.action === 'list') {
    const { results } = await env.DB.prepare(
      'SELECT title, CAST(paise AS REAL)/100 AS amount, payer, description, added_at AS addedAt FROM expenses ORDER BY rowid DESC'
    ).all();
    return json({ ok: true, entries: results });
  }
  if (input.action !== 'append') return error('Unsupported action.', 400);

  const title = typeof input.title === 'string' ? input.title.trim() : '';
  const description = typeof input.description === 'string' ? input.description.trim() : '';
  const amount = typeof input.amount === 'string' && /^\d{1,9}(?:\.\d{1,2})?$/.test(input.amount)
    ? Math.round(Number(input.amount) * 100) : 0;
  const validId = typeof input.id === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(input.id);
  if (!title || title.length > 120 || description.length > 500 || amount <= 0 ||
      !payers.includes(input.payer) || !validId) {
    return error('Enter a title, a valid rupee amount, and a payer.', 400);
  }
  await env.DB.prepare(
    'INSERT INTO expenses (id, title, paise, payer, description, added_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING'
  ).bind(input.id, title, amount, input.payer, description, new Date().toISOString()).run();
  return json({ ok: true });
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === '/api/expenses') {
      try {
        return await expenses(request, env);
      } catch (cause) {
        console.error('Expense request failed', cause.message);
        return error('The ledger is temporarily unavailable.', 500);
      }
    }
    const asset = Object.hasOwn(assets, path) && assets[path];
    if (!asset || !['GET', 'HEAD'].includes(request.method)) return new Response('Not found', { status: 404 });
    return new Response(request.method === 'HEAD' ? null : asset.body, {
      headers: { ...headers, 'Content-Type': asset.type, 'X-Frame-Options': 'DENY' },
    });
  },
};
