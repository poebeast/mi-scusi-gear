// Забирает собранные в Chrome данные вики из служебных записей Firebase в data/raw/.
const fs = require('fs');
const path = require('path');
const BASE = 'https://firestore.googleapis.com/v1/projects/mi-scusi-gear/databases/(default)/documents/parties/ms-00f529c6acff2d5c47/dump/d';
const KEY = '?key=AIzaSyA0L4LrQoFb5BWc86mqeFuBNEJ4sKf14kA';
const get = async i => (await (await fetch(BASE + i + KEY)).json()).fields.data.stringValue;
const out = n => path.join(__dirname, 'data/raw/' + n);
(async () => {
  const head = JSON.parse(await get(0));
  let text = '';
  for (let i = 1; i <= head.chunks; i++) text += await get(i);
  if (text.length !== head.length) throw new Error('длина не сошлась: ' + text.length + ' / ' + head.length);
  const { items, sets, cls, skills } = JSON.parse(text);
  fs.writeFileSync(out('items.json'), JSON.stringify(items));
  fs.writeFileSync(out('sets.json'), JSON.stringify(sets));
  if (cls) fs.writeFileSync(out('cls.json'), JSON.stringify(cls));
  if (skills) fs.writeFileSync(out('skills2.json'), JSON.stringify(skills));
  console.log('items', Object.keys(items).length, 'sets', Object.keys(sets).length, 'classes', Object.keys(cls || {}).length, 'skills', Object.keys(skills || {}).length, 'от', new Date(head.at).toISOString());
})();
