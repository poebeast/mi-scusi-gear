// Превращает сырые данные вики (data/raw/*.json) в items.json, sets.json, buffs.json.
const fs = require('fs');
const path = require('path');
const R = p => path.join(__dirname, p);
const raw = name => JSON.parse(fs.readFileSync(R('data/raw/' + name), 'utf8'));

const rawItems = raw('items.json');
const rawSets = raw('sets.json');
const rawSkills = raw('skills.json');
const classSkills = raw('classSkills.json');

const idOf = href => (href.match(/\/(\d+)-/) || [])[1];
const num = s => { const m = String(s || '').replace(/\s/g, '').match(/[-+]?\d+(?:[.,]\d+)?/); return m ? parseFloat(m[0].replace(',', '.')) : null; };
const unknown = { types: new Set(), stats: new Set(), heads: new Set() };

function slotAndKind(type, name) {
  const t = type.toLowerCase();
  const parts = t.split('/').map(s => s.trim());
  const cat = parts[0] || '';
  const res = {};
  if (/оруж/.test(cat)) {
    res.c = 'weapon'; res.s = 'weapon';
    const w = parts[1] || '', hand = parts.slice(2).join(' ');
    const two = /двуруч/.test(hand);
    if (/прочее/.test(w)) return {};
    if (/парн|двойн|дуал/.test(w + ' ' + hand)) res.wt = /кинжал/.test(w + hand) ? 'dualdagger' : /дробящ/.test(w + hand) ? 'dualblunt' : /кастет|кулач/.test(w + hand) ? 'dualfist' : 'dual';
    else if (/рапир/.test(w)) res.wt = 'rapier';
    else if (/древн/.test(w)) res.wt = 'ancientsword';
    else if (/меч/.test(w)) res.wt = two ? 'bigsword' : 'sword';
    else if (/дробящ/.test(w)) res.wt = two ? 'bigblunt' : 'blunt';
    else if (/кинжал/.test(w)) res.wt = 'dagger';
    else if (/лук|арбалет/.test(w)) res.wt = 'bow';
    else if (/копь|древков|алебард/.test(w)) res.wt = 'pole';
    else if (/кастет|кулач/.test(w)) res.wt = 'fist';
    else unknown.types.add(type);
  } else if (/аксесс|бижут|украш/.test(cat)) {
    res.c = 'jewel';
    const w = parts.slice(1).join(' ');
    res.s = /серьг/.test(w) ? 'ear' : /кольц/.test(w) ? 'ring' : /ожерел/.test(w) ? 'neck' : null;
    if (!res.s) unknown.types.add(type);
  } else if (/доспех|брон/.test(cat)) {
    res.c = 'armor';
    const all = parts.slice(1).join(' ');
    res.at = /тяж/.test(all) ? 'heavy' : /легк|лёгк/.test(all) ? 'light' : /роб|мант|магич/.test(all) ? 'robe' : undefined;
    const p = parts[parts.length - 1];
    res.s = /полн/.test(p) ? 'full' : /верх|нагруд|торс/.test(p) ? 'chest' : /низ|ног|штан|поножи/.test(p) ? 'legs'
      : /голов|шлем/.test(p) ? 'head' : /перчат|рук/.test(p) ? 'gloves' : /сапог|обув|ступ/.test(p) ? 'feet' : /щит/.test(p) ? 'shield' : /сигил/.test(p) ? 'sigil' : null;
    if (!res.s) unknown.types.add(type);
  } else unknown.types.add(type);
  return res;
}

const STAT_KEYS = {
  'Физ. Защ.': 'pdef', 'Маг. Защ.': 'mdef', 'Шанс Физ. Крит. Атк.': 'crit', 'Точность': 'acc', 'Уклонение': 'eva', 'Скор. Атк.': 'aspd', 'Скорость Атк.': 'aspd',
};
const HEAD_KEYS = { 'Физ. Защ.': 'pdef', 'Маг. Защ.': 'mdef', 'Физ. Атк.': 'patk', 'Маг. Атк.': 'matk', 'HP Bonus': 'hp' };
const IGNORE_STATS = new Set(['In English', 'Стоимость продажи NPC', 'Вес', 'Часть комплекта', 'Умения предмета', 'Расход Зарядов Души / Духа', 'Исходный предмет', 'Оригинальный предмет', 'Предметные умения', 'Рецепты', 'Кристаллы Души']);

function cleanFx(fx) {
  return String(fx || '').split('\n').map(s => s.trim())
    .filter(s => s && !/^<[^>]+>$/.test(s))
    .filter(s => /\d/.test(s) || /:$/.test(s))
    .join('\n');
}

const items = [];
for (const r of Object.values(rawItems)) {
  if (!r || !r.name || !/^[AB]$/.test(r.g || '')) continue;
  // PvP-версии не нужны.
  if (/\{pvp\}|\bpvp\b/i.test(r.name + ' ' + (r.add || []).join(' '))) continue;
  const id = idOf(r.href);
  const sk = slotAndKind(r.type, r.name);
  if (!sk.s) continue;
  const add = (r.add || []).map(s => s.trim()).filter(Boolean);
  const fnd = add.some(a => /foundation/i.test(a)) || /foundation/i.test(r.name);
  const pvp = /\{pvp\}/i.test(r.name);
  const sa = add.filter(a => !/foundation/i.test(a)).join(' ') || undefined;
  const st = {};
  for (const [k, v] of Object.entries(r.st || {})) {
    if (IGNORE_STATS.has(k)) continue;
    if (k === 'Физ. Атк. / Маг. Атк.') { const [p, m] = String(v).split('/'); st.patk = num(p); st.matk = num(m); continue; }
    if (STAT_KEYS[k]) { st[STAT_KEYS[k]] = num(v); continue; }
    unknown.stats.add(k);
  }
  let en;
  if (r.en && r.en.rows && r.en.rows.length) {
    en = {};
    r.en.heads.forEach((head, col) => {
      const key = HEAD_KEYS[head];
      if (!key) { if (!/Модификац|Кристалл|Бонус зарядов|NPC|Количество|Шанс|Предмет|Тип получения/.test(head)) unknown.heads.add(head); return; }
      en[key] = r.en.rows.map(row => num(row[col]) || 0);
    });
  }
  if (sk.wt === 'bigblunt' && st.matk && st.patk && st.matk >= st.patk * 0.75) sk.wt = 'staff';
  items.push(Object.assign({ id, n: r.name, g: r.g, ic: (r.icon || '').replace(/\.png$/, ''), st, en, fx: cleanFx(r.fx) || undefined, sa, fnd: fnd || undefined, pvp: pvp || undefined, set: r.set ? idOf(r.set) : undefined, key: [r.name, fnd, pvp].join('|') }, sk));
}
// Варианты SA одного оружия: base — вариант без SA (или первый).
const groups = {};
for (const it of items) (groups[it.key] = groups[it.key] || []).push(it);
for (const list of Object.values(groups)) {
  const base = list.find(x => !x.sa) || list[0];
  for (const it of list) { if (list.length > 1) it.base = base.id; delete it.key; }
}
const byId = new Map(items.map(i => [i.id, i]));

const sets = [];
for (const r of Object.values(rawSets)) {
  if (!r || !/^[AB]$/.test(r.g || '')) continue;
  const bySlot = {};
  for (const h of r.parts || []) {
    const it = byId.get(idOf(h)); if (!it) continue;
    const slot = it.s === 'full' ? 'chest' : it.s;
    (bySlot[slot] = bySlot[slot] || []).push(it.id);
  }
  const parts = Object.entries(bySlot).map(([slot, ids]) => ({ slot, ids, shield: slot === 'shield' || slot === 'sigil' }));
  const chestItem = (bySlot.chest || []).map(i => byId.get(i)).find(Boolean);
  const hasFull = chestItem && chestItem.s === 'full';
  // Для цельной брони слот штанов не требуется.
  const finalParts = hasFull ? parts.filter(p => p.slot !== 'legs') : parts;
  sets.push({ id: idOf(r.href), n: r.name, g: r.g, at: chestItem && chestItem.at, fx: r.fx, parts: finalParts });
}

const CLASS_OF = classSkills;
const buffs = [];
for (const [href, r] of Object.entries(rawSkills)) {
  if (!r || !r.lv || !r.lv.length) continue;
  const cls = Object.keys(CLASS_OF).filter(k => CLASS_OF[k][href]);
  const grp = cls.map(k => CLASS_OF[k][href])[0];
  const text = r.lv.join('\n');
  const toggle = grp === 'icon_type-6';
  let tgt = 'self';
  if (!toggle) {
    if (/party members|for the party|all party|группы/i.test(text) || /^(Mass |Chant|Rhythm|Song|Dance|Symphony)|Pa'agrio|Paagrio/i.test(r.name)) tgt = 'party';
    else if (r.st && r.st['Дальность применения']) tgt = 'target';
  }
  buffs.push({ id: (href.match(/\/skill\/(\d+)/) || [])[1], n: r.name, ic: (r.icon || '').replace(/\.png$/, ''), cls, kind: toggle ? 'toggle' : 'buff', tgt, lv: r.lv, dur: r.st && r.st['Время действия'] });
}

fs.writeFileSync(R('data/items.json'), JSON.stringify(items));
fs.writeFileSync(R('data/sets.json'), JSON.stringify(sets));
fs.writeFileSync(R('data/buffs.json'), JSON.stringify(buffs));
const iconList = [...new Set([...items.map(i => i.ic), ...buffs.map(b => b.ic)].filter(Boolean))];
fs.writeFileSync(R('data/raw/icon-list.txt'), iconList.join('\n'));
console.log('items', items.length, 'sets', sets.length, 'buffs', buffs.length, 'icons', iconList.length);
console.log('slots', JSON.stringify(items.reduce((o, i) => ((o[i.s] = (o[i.s] || 0) + 1), o), {})));
console.log('unknown types', [...unknown.types].slice(0, 40));
console.log('unknown stats', [...unknown.stats]);
console.log('unknown enchant heads', [...unknown.heads]);
