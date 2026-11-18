'use strict';

const people = ['Sachin', 'Vikas', 'Manisha', 'Basuki'];
const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
const date = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'Asia/Kolkata' });
const byId = id => document.getElementById(id);
const access = byId('access');
const expense = byId('expense');
const refresh = byId('refresh');
const owner = byId('owner');
const ownerDialog = byId('owner-dialog');
const editDialog = byId('edit-dialog');
const editForm = expense.cloneNode(true);
editForm.id = 'edit-expense';
editForm.querySelector('[role="status"]').id = 'edit-status';
const editSubmit = editForm.querySelector('button');
editSubmit.textContent = 'Save changes';
const cancelEdit = document.createElement('button');
cancelEdit.type = 'button';
cancelEdit.className = 'quiet';
cancelEdit.textContent = 'Cancel';
cancelEdit.addEventListener('click', () => editDialog.close());
editForm.append(cancelEdit);
editDialog.append(editForm);
let ownerPassword = '';
let selectedId;
let displayedEntries = [];
let pending;
let version = 0;

async function request(payload) {
  const response = await fetch('./api/expenses', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(25000),
  });
  const data = await response.json().catch(() => {
    throw new Error('The ledger returned an unexpected response.');
  });
  if (!response.ok || !data.ok) throw new Error(data.message || 'The ledger is unreachable.');
  return data.entries;
}

function render(entries) {
  displayedEntries = entries;
  byId('edit-column').hidden = !ownerPassword;
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
    if (ownerPassword) {
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'quiet';
      edit.textContent = 'Edit';
      edit.setAttribute('aria-label', 'Edit ' + entry.title);
      edit.addEventListener('click', () => {
        selectedId = entry.id;
        for (const name of ['title', 'amount', 'payer', 'description']) {
          editForm.elements[name].value = entry[name];
        }
        byId('edit-status').textContent = '';
        editDialog.showModal();
      });
      row.insertCell().append(edit);
    }
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
    if (current === version) refresh.disabled = false;
  }
}

owner.addEventListener('click', () => {
  if (ownerPassword) {
    ownerPassword = '';
    owner.textContent = 'Sachin · Owner';
    render(displayedEntries);
    return;
  }
  access.reset();
  byId('access-status').textContent = '';
  ownerDialog.showModal();
});

access.querySelector('[data-close]').addEventListener('click', () => ownerDialog.close());
ownerDialog.addEventListener('close', () => access.reset());
access.addEventListener('submit', async event => {
  event.preventDefault();
  const button = access.querySelector('button:last-of-type');
  const status = byId('access-status');
  const password = access.elements.password.value;
  button.disabled = true;
  status.textContent = 'Checking password…';
  try {
    await request({ action: 'owner', password });
    if (!ownerDialog.open) return;
    ownerPassword = password;
    owner.textContent = 'Exit owner mode';
    ownerDialog.close();
    render(displayedEntries);
  } catch (error) {
    status.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

editForm.addEventListener('submit', async event => {
  event.preventDefault();
  const status = byId('edit-status');
  editSubmit.disabled = true;
  cancelEdit.disabled = true;
  status.textContent = 'Saving changes…';
  try {
    const fields = Object.fromEntries(new FormData(editForm));
    await request({ ...fields, action: 'edit', id: selectedId, password: ownerPassword });
    editDialog.close();
    byId('save-status').textContent = 'Expense updated.';
    await load();
  } catch (error) {
    status.textContent = error.message;
  } finally {
    editSubmit.disabled = false;
    cancelEdit.disabled = false;
  }
});

editDialog.addEventListener('cancel', event => {
  if (editSubmit.disabled) event.preventDefault();
});

expense.addEventListener('submit', async event => {
  event.preventDefault();
  const fields = Object.fromEntries(new FormData(expense));
  const signature = JSON.stringify(fields);
  if (pending?.signature !== signature) pending = { signature, id: crypto.randomUUID() };
  const button = expense.querySelector('button');
  const status = byId('save-status');
  button.disabled = true;
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
  }
});

refresh.addEventListener('click', load);
load();
