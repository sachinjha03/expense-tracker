const PAYERS = ['Sachin', 'Vikas', 'Manisha', 'Basuki'];
const HEADERS = ['Title', 'Amount (INR)', 'Spent by', 'Description', 'Added at', 'Entry ID'];

function doGet() {
  return json_({ ok: true, service: 'Wedding expense tracker' });
}

function doPost(event) {
  try {
    if (!event.postData || event.postData.length > 8192) return error_('Invalid request.');
    const input = JSON.parse(event.postData.contents);
    const properties = PropertiesService.getScriptProperties();
    const expected = properties.getProperty('ACCESS_CODE');
    if (!expected || expected.length < 20) return error_('The owner needs to configure the access code.');
    if (typeof input?.code !== 'string' || input.code.length > 256 || !matches_(input.code, expected)) {
      return error_('Incorrect access code.');
    }
    if (!['list', 'append'].includes(input.action)) return error_('Unsupported action.');
    const sheet = SpreadsheetApp.openById(properties.getProperty('SPREADSHEET_ID')).getSheetByName('Expenses');
    if (!sheet || sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0].join('|') !== HEADERS.join('|')) {
      return error_('The Expenses tab is missing or its headers have changed.');
    }
    if (input.action === 'list') return json_({ ok: true, entries: list_(sheet) });

    const title = typeof input.title === 'string' ? input.title.trim() : '';
    const description = typeof input.description === 'string' ? input.description.trim() : '';
    const amount = typeof input.amount === 'string' && /^\d{1,9}(?:\.\d{1,2})?$/.test(input.amount)
      ? Number(input.amount) : 0;
    if (!title || title.length > 120 || description.length > 500 || amount <= 0 ||
        !PAYERS.includes(input.payer) || typeof input.id !== 'string' ||
        !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(input.id)) {
      return error_('Enter a title, a valid rupee amount, and a payer.');
    }

    const lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) return error_('The ledger is busy. Please retry.');
    try {
      const last = sheet.getLastRow();
      const duplicate = last > 1 && sheet.getRange(2, 6, last - 1, 1)
        .createTextFinder(input.id).matchEntireCell(true).findNext();
      if (!duplicate) {
        sheet.appendRow([literal_(title), amount, input.payer, literal_(description), new Date(), input.id]);
        SpreadsheetApp.flush();
      }
      return json_({ ok: true });
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    console.error(error.message);
    return error_('The ledger could not complete this request.');
  }
}

function list_(sheet) {
  const count = sheet.getLastRow() - 1;
  if (count < 1) return [];
  return sheet.getRange(2, 1, count, HEADERS.length).getValues().reverse()
    .filter(([title, amount]) => title && typeof amount === 'number' && Number.isFinite(amount))
    .map(([title, amount, payer, description, addedAt]) => ({
      title: String(title), amount, payer: String(payer), description: String(description),
      addedAt: addedAt instanceof Date ? addedAt.toISOString() : null,
    }));
}

function matches_(actual, expected) {
  const hash = value => Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value);
  const left = hash(actual);
  const right = hash(expected);
  return left.reduce((difference, byte, i) => difference | (byte ^ right[i]), 0) === 0;
}

function literal_(value) {
  return /^[=+\-@']/.test(value) ? "'" + value : value;
}

function error_(message) {
  return json_({ ok: false, message });
}

function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
