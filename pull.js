// Забирает собранные в Chrome данные вики из служебных записей Firebase в data/raw/.
const fs = require('fs');
const path = require('path');
const BASE = 'https://firestore.googleapis.com/v1/projects/mi-scusi-gear/databases/(default)/documents/parties/ms-00f529c6acff2d5c47/dump/d';
const KEY = '?key=AIzaSyA0L4LrQoFb5BWc86mqeFuBNEJ4sKf14kA';
const get = async i => (await (await fetch(BASE + i + KEY)).json()).fields.data.stringValue;
(async () => {
  const head = JSON.parse(await get(0));
  let text = '';
  for (let i = 1; i <= head.chunks; i++) text += await get(i);
  if (text.length !== head.length) throw new Error('длина не сошлась: ' + text.length + ' / ' + head.length);
  const { items, sets } = JSON.parse(text);
  fs.writeFileSync(path.join(__dirname, 'data/raw/items.json'), JSON.stringify(items));
  fs.writeFileSync(path.join(__dirname, 'data/raw/sets.json'), JSON.stringify(sets));
  console.log('items', Object.keys(items).length, 'sets', Object.keys(sets).length, 'от', new Date(head.at).toISOString());
})();
