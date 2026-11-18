'use strict';

const people = ['Sachin', 'Vikas', 'Manisha', 'Basuki'];
const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
const date = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'Asia/Kolkata' });
const byId = id => document.getElementById(id);
const access = byId('access');
const expense = byId('expense');
const refresh = byId('refresh');
const lock = byId('lock');
let code = '';
let pending;
let version = 0;

async function request(payload) {
  const response = await fetch(window.expenseEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: JSON.stringify({ ...payload, code }),
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok) throw new Error('Google Sheets is unreachable.');
  const data = await response.json().catch(() => {
    throw new Error('Check the Google Apps Script deployment settings.');
  });
  if (!data.ok) throw new Error(data.message);
  return data.entries;
}

function render(entries) {
  const totals = Object.fromEntries(people.map(name => [name, 0]));
  let total = 0;
  const body = document.createDocumentFragment();
  for (const entry of entries) {
    const paise = Math.round(entry.amount * 100);
    total += paise;
    const payer = people.find(name => name.toLowerCase() === entry.payer.toLowerCase());
    if (payer) totals[payer] += paise;

    const row = document.createElement('tr');
    const title = row.insertCell();
    title.textContent = entry.title;
    const details = [entry.addedAt && date.format(new Date(entry.addedAt)), entry.description].filter(Boolean);
    for (const detail of details) {
      const note = document.createElement('small');
      note.textContent = detail;
      title.append(note);
    }
    row.insertCell().textContent = entry.payer;
    row.insertCell().textContent = currency.format(entry.amount);
    body.append(row);
  }
  const tiles = Object.entries({ 'Total expense': total, ...totals }).map(([label, paise]) => {
    const tile = document.createElement('div');
    tile.className = 'tile';
    const name = document.createElement('span');
    const value = document.createElement('strong');
    name.textContent = label;
    value.textContent = currency.format(paise / 100);
    tile.append(name, value);
    return tile;
  });
  byId('totals').replaceChildren(...tiles);
  const table = byId('table');
  table.tBodies[0].replaceChildren(body);
  table.hidden = !entries.length;
  byId('read-status').textContent = entries.length ? '' : 'No expenses yet.';
}

async function load() {
  const current = ++version;
  refresh.disabled = true;
  byId('read-status').textContent = 'Loading expenses…';
  try {
    const entries = await request({ action: 'list' });
    if (current === version) render(entries);
  } catch (error) {
    if (current === version) byId('read-status').textContent = 'Refresh failed. ' + error.message;
  } finally {
    refresh.disabled = false;
  }
}

access.addEventListener('submit', async event => {
  event.preventDefault();
  const button = access.querySelector('button');
  const status = byId('access-status');
  button.disabled = true;
  status.textContent = 'Opening the ledger…';
  code = access.elements.code.value;
  try {
    render(await request({ action: 'list' }));
    access.reset();
    status.textContent = '';
    byId('unlock').hidden = true;
    byId('dashboard').hidden = false;
    lock.hidden = false;
  } catch (error) {
    code = '';
    status.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

expense.addEventListener('submit', async event => {
  event.preventDefault();
  const fields = Object.fromEntries(new FormData(expense));
  const signature = JSON.stringify(fields);
  if (pending?.signature !== signature) pending = { signature, id: crypto.randomUUID() };
  const button = expense.querySelector('button');
  const status = byId('save-status');
  button.disabled = true;
  lock.disabled = true;
  status.textContent = 'Saving…';
  try {
    await request({ ...fields, action: 'append', id: pending.id });
    pending = undefined;
    expense.reset();
    status.textContent = 'Expense saved.';
    await load();
  } catch (error) {
    status.textContent = error.message + ' Retry with the same details if you are unsure whether it saved.';
  } finally {
    button.disabled = false;
    lock.disabled = false;
  }
});

refresh.addEventListener('click', load);
lock.addEventListener('click', () => {
  ++version;
  code = '';
  pending = undefined;
  expense.reset();
  render([]);
  byId('save-status').textContent = '';
  lock.hidden = true;
  byId('dashboard').hidden = true;
  byId('unlock').hidden = false;
  access.elements.code.focus();
});

byId(window.expenseEndpoint ? 'unlock' : 'setup').hidden = false;
