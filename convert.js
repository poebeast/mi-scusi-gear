// Превращает сырые данные вики (data/raw/*.json) в items.json, sets.json, buffs.json.
const fs = require('fs');
const path = require('path');
const R = p => path.join(__dirname, p);
const raw = name => JSON.parse(fs.readFileSync(R('data/raw/' + name), 'utf8'));

// Вещи, собранные отдельно (эпическая бижутерия), лежат в extra-items.json.
const rawItems = Object.assign(raw('items.json'), fs.existsSync(R('data/raw/extra-items.json')) ? raw('extra-items.json') : {});
const rawSets = raw('sets.json');
const rawOr = (name, d) => (fs.existsSync(R('data/raw/' + name)) ? raw(name) : d);
const rawSkills = rawOr('skills.json', {});
const classSkills = rawOr('classSkills.json', {});

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
  } else if (/аксесс|бижут|украш|accessor|jewel/.test(cat)) {
    res.c = 'jewel';
    const w = parts.slice(1).join(' ');
    // Страницы вики бывают и на русском, и на английском.
    res.s = /серьг|earring/.test(w) ? 'ear' : /кольц|ring/.test(w) ? 'ring' : /ожерел|necklace/.test(w) ? 'neck' : null;
    if (!res.s) unknown.types.add(type);
  } else if (/доспех|брон/.test(cat)) {
    res.c = 'armor';
    const all = parts.slice(1).join(' ');
    res.at = /тяж/.test(all) ? 'heavy' : /легк|лёгк/.test(all) ? 'light' : /роб|мант|магич/.test(all) ? 'robe' : undefined;
    const p = parts[parts.length - 1];
    res.s = /полн/.test(p) ? 'full' : /верх|нагруд|торс/.test(p) ? 'chest' : /низ|ниж|ног|штан|поножи/.test(p) ? 'legs'
      : /голов|шлем/.test(p) ? 'head' : /перчат|рук/.test(p) ? 'gloves' : /сапог|обув|ступ/.test(p) ? 'feet' : /щит/.test(p) ? 'shield' : /сигил/.test(p) ? 'sigil' : null;
    if (!res.s) unknown.types.add(type);
  } else unknown.types.add(type);
  return res;
}

const STAT_KEYS = {
  'Защита Щитом': 'pdef',
  'P. Def.': 'pdef', 'M. Def.': 'mdef', 'Физ. Защ.': 'pdef', 'Маг. Защ.': 'mdef', 'Шанс Физ. Крит. Атк.': 'crit', 'Точность': 'acc', 'Уклонение': 'eva', 'Скор. Атк.': 'aspd', 'Скорость Атк.': 'aspd', 'Бонус MP': 'mpb',
};
const HEAD_KEYS = { 'Защита Щитом': 'pdef', 'Физ. Защ.': 'pdef', 'Маг. Защ.': 'mdef', 'Физ. Атк.': 'patk', 'Маг. Атк.': 'matk', 'HP Bonus': 'hp', 'Бонус зарядов': 'shot' };
const IGNORE_STATS = new Set(['Restrictions', 'Crystal Amount', 'NPC Sell Price', 'Weight', 'Item Skills', 'Item skills', 'Recipes', 'Set', 'In English', 'Стоимость продажи NPC', 'Вес', 'Часть комплекта', 'Умения предмета', 'Расход Зарядов Души / Духа', 'Исходный предмет', 'Оригинальный предмет', 'Предметные умения', 'Рецепты', 'Кристаллы Души']);

function cleanFx(fx) {
  return String(fx || '').split('\n').map(s => s.trim())
    .filter(s => s && !/^<[^>]+>$/.test(s))
    .filter(s => /\d/.test(s) || /:$/.test(s))
    .join('\n');
}

const items = [];
for (const r of Object.values(rawItems)) {
  // Эпическая бижутерия (Queen Ant, Orfen, Core) — отдельный грейд Epic вместо C.
  const EPIC = new Set(['6660', '36454', '6661', '6662']);
  const epic = r && EPIC.has(idOf(r.href));
  if (epic) r.g = 'Epic';
  if (!r || !r.name || !(/^[AB]$/.test(r.g || '') || epic)) continue;
  // Улучшенные версии эпической бижутерии (The 1st, Enchanted, Refined) не нужны.
  if (/^(The 1st |Enchanted |Refined )/i.test(r.name) && /Orfen|Core/i.test(r.name)) continue;
  // PvP-версии не нужны.
  if (/\{pvp\}|\bpvp\b/i.test(r.name + ' ' + (r.add || []).join(' '))) continue;
  // Предметы-оружие монстров (иконка weapon_monster) — не экипировка игрока.
  if (/monster/i.test(r.icon || '')) continue;
  const id = idOf(r.href);
  const sk = slotAndKind(r.type, r.name);
  if (!sk.s) continue;
  // «Heavy Armor / Light Armor / Robe» у перчаток, ботинок и шлемов — это тип брони, а не SA.
  const ARM = { 'heavy armor': 'heavy', 'light armor': 'light', robe: 'robe' };
  const add = (r.add || []).map(s => s.trim()).filter(Boolean).filter(a => { const k = ARM[a.toLowerCase()]; if (k) { sk.at = k; return false; } return true; });
  // Редкая версия (Lu4 Gamma): у неё есть блок <Rare Item Effect>.
  const fnd = /<Rare Item Effect>/i.test(r.fx || '') || add.some(a => /foundation/i.test(a));
  const pvp = /\{pvp\}/i.test(r.name);
  const sa = add.filter(a => !/foundation/i.test(a)).join(' ') || undefined;
  const st = {};
  for (const [k, v] of Object.entries(r.st || {})) {
    if (IGNORE_STATS.has(k)) continue;
    if (k === 'Физ. Атк. / Маг. Атк.') { const [p, m] = String(v).split('/'); st.patk = num(p); st.matk = num(m); continue; }
    // «256 (20%)»: защита щитом и шанс блока.
    if (k === 'Защита Щитом') { st.pdef = num(v); const m = String(v).match(/\(\s*(\d+(?:[.,]\d+)?)\s*%/); if (m) st.srate = parseFloat(m[1].replace(',', '.')); continue; }
    if (STAT_KEYS[k]) { st[STAT_KEYS[k]] = num(v); continue; }
    unknown.stats.add(k);
  }
  let en;
  if (r.en && r.en.rows && r.en.rows.length && r.en.heads[0] === 'Модификация') {
    en = {};
    r.en.heads.forEach((head, col) => {
      const key = HEAD_KEYS[head];
      if (!key) { if (!/Модификац|Кристалл|NPC|Количество|Шанс|Предмет|Тип получения/.test(head)) unknown.heads.add(head); return; }
      en[key] = r.en.rows.map(row => num(row[col]) || 0);
    });
  }
  // У щитов таблица заточки даёт прибавку (от 0) — накладываем её на защиту щитом.
  if (sk.s === 'shield' && en && en.pdef && st.pdef != null) en.pdef = en.pdef.map(v => st.pdef + v - en.pdef[0]);
  if (sk.wt === 'bigblunt' && st.matk && st.patk && st.matk >= st.patk * 0.75) sk.wt = 'staff';
  // Умение предмета «Magic Essence» у топовых магических оружий — M. Crit. Damage +10%
  // (на вики только название умения; эффект сверен с Lu4 Planner).
  const essence = String(r.st && r.st['Предметные умения'] || '').split('\n').some(l => !/Special Ability/.test(l) && /Magic Essence/.test(l));
  const fxAll = essence ? (r.fx ? r.fx + '\n' : '') + 'M. Crit. Damage +10%.' : r.fx;
  items.push(Object.assign({ id, n: r.name, g: r.g, ic: (r.icon || '').replace(/\.png$/, ''), st, en, fx: cleanFx(fxAll) || undefined, sa, fnd: fnd || undefined, pvp: pvp || undefined, set: r.set ? idOf(r.set) : undefined, key: [r.name, fnd, pvp, sk.at || ''].join('|') }, sk));
}
// Если на странице первой шла таблица дропа, берём таблицу заточки у одноимённого предмета.
const enByName = {};
for (const it of items) if (it.en && !enByName[it.n + '|' + it.s]) enByName[it.n + '|' + it.s] = it.en;
for (const it of items) if (!it.en && enByName[it.n + '|' + it.s]) it.en = enByName[it.n + '|' + it.s];
// Если таблицы нет совсем — берём прибавки за заточку у вещи того же грейда и слота и накладываем на базовые статы.
const deltaDonor = {};
for (const it of items) if (it.en) { const k = [it.g, it.s, it.wt || '', it.at || ''].join('|'); if (!deltaDonor[k]) deltaDonor[k] = it; }
for (const it of items) {
  if (it.en) continue;
  const d = deltaDonor[[it.g, it.s, it.wt || '', it.at || ''].join('|')] || items.find(o => o.en && o.g === it.g && o.s === it.s) || items.find(o => o.en && o.en.pdef && o.g === it.g && o.c === 'armor' && ['head', 'gloves', 'feet'].includes(o.s)) || items.find(o => o.en && o.s === it.s && o.g === 'A');
  // Для брони без своей таблицы прибавка приблизительная: как у шлема/перчаток того же грейда, у цельной — вдвое.
  if (!d) { console.warn('без заточки:', it.n); continue; }
  it.en = {};
  for (const [k, arr] of Object.entries(d.en)) {
    if (k === 'hp') continue;
    // Бонус зарядов одинаков у всего оружия грейда — копируем как есть.
    if (k === 'shot') { if (d.c === it.c) it.en.shot = arr.slice(); continue; }
    const base = it.st[k]; if (base == null) continue;
    const scale = it.s === 'full' && d.s !== 'full' ? 2 : 1;
    if (k !== 'pdef' && k !== 'mdef' && d.c !== it.c) continue;
    it.en[k] = arr.map(v => base + (v - arr[0]) * scale);
  }
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
  // Редкий сет — тот, где верх брони в редкой версии.
  const rare = chestItem && chestItem.fnd;
  const SHIELD_FX = { 'Avadon Breastplate': 'Increases Shield Defence Rate.', 'Doom Plate Armor': 'Increases Shield Defence Rate.', 'Dark Crystal Breastplate': 'Shield Defense Rate +20%.', 'Armor of Nightmare': 'Reflects 5% of any damage received.' };
  const shieldFx = finalParts.some(p => p.shield) ? SHIELD_FX[r.name] : undefined;
  sets.push({ id: idOf(r.href), n: r.name + (rare ? ' (Rare)' : ''), g: r.g, at: chestItem && chestItem.at, fx: r.fx, shieldFx, parts: finalParts });
}

// ---------------------------------------------------------------- пассивки классов
// Уровни изучения: 1-я профессия (20–39) и 2-я (40–75). На уровне персонажа L берём наибольший уровень умения, выученный не позже L.
const clsRaw = rawOr('cls.json', {});
// skills3.json — дособранные страницы: умения базовых классов и одноуровневые умения с описанием вне таблицы.
const skRaw = Object.assign({}, rawOr('skills2.json', {}));
for (const [k, v] of Object.entries(rawOr('skills3.json', {}))) if (v && v.lv && Object.keys(v.lv).length) skRaw[k] = v;
// skills4.json — умения остальных классов (противники).
for (const [k, v] of Object.entries(rawOr('skills4.json', {}))) if (v && v.lv && Object.keys(v.lv).length && !skRaw[k]) skRaw[k] = v;

// ---------------------------------------------------------------- остальные классы 2-й профессии (противники)
// Группы умений — со страницы класса на вики (/all). Уровни изучения — из Lu4 Planner:
// пассивки по уровням персонажа 1–75, атакующие умения по magicLevel (он совпадает с уровнем изучения).
const allRaw = rawOr('all.json', {});
const pj = rawOr('planner.json', { curve: {}, skills: {}, meta: {} });
const NEW_PL = { gladiator: 'gladiator', warlord: 'warlord', darkavenger: 'dark_avenger', treasurehunter: 'treasure_hunter', sorcerer: 'sorcerer', necromancer: 'necromancer', warlock: 'warlock', prophet: 'prophet', templeknight: 'temple_knight', plainwalker: 'plain_walker', spellsinger: 'spellsinger', elementalsummoner: 'elemental_summoner', shillienknight: 'shillien_knight', bladedancer: 'bladedancer', abysswalker: 'abyss_walker', spellhowler: 'spellhowler', phantomsummoner: 'phantom_summoner', shillienelder: 'shillien_elder', destroyer: 'destroyer', tyrant: 'tyrant', warcryer: 'warcryer', bountyhunter: 'bounty_hunter', warsmith: 'warsmith', terramancer: 'terramancer' };
const keyById = {};
for (const k of Object.keys(skRaw)) { const id = k.split('-')[0]; if (!keyById[id]) keyById[id] = k; }
for (const c of Object.values(allRaw)) for (const k of Object.keys(c.groups || {})) { const id = k.split('-')[0]; if (!keyById[id]) keyById[id] = k; }
// Пассивки противника по уровням: [[уровень персонажа, уровень умения], …] из расчёта планнера.
const plannerPassives = pid => {
  const cv = (pj.curve || {})[pid] || {};
  const learn = {};
  for (let L = 1; L <= 75; L++) {
    const x = cv[L]; if (!x || !x.pas) continue;
    for (const p of x.pas.split(',')) { const [id, l] = p.split(':'); if (!id) continue; const arr = learn[id] = learn[id] || []; if (!arr.some(a => a[1] === +l)) arr.push([L, +l]); }
  }
  return learn;
};
// Базовый класс (уровни 1–19): Fighter, Mage, Elven Fighter и т. д.
const baseRaw = rawOr('base.json', {});
const BASE_OF = { paladin: '0-fighter', hawkeye: '0-fighter', bishop: '10-mage', elder: '25-elvenmage', swordsinger: '18-elvenfighter', silverranger: '18-elvenfighter', phantomranger: '31-darkfighter', overlord: '49-orcmage' };
const baseSched = cls => Object.fromEntries(Object.entries((baseRaw[BASE_OF[cls]] || {}).sched || {}).filter(([L]) => +L < 20));
const isPassiveType = t => /^(Passive|Пассивн)/i.test(t || '') && !/Clan|Клан/i.test(t || '');
const PASS = /^icon_type-(11|12|14|18)$/;
// Мастерства оружия действуют только с подходящим оружием.
const WEAPON_OF = [
  [/Sword\/Blunt Weapon Mastery/i, ['sword', 'bigsword', 'blunt', 'bigblunt', 'dual', 'dualblunt', 'rapier', 'ancientsword']],
  [/Dagger Mastery/i, ['dagger', 'dualdagger']],
  [/Bow Mastery/i, ['bow']],
  [/Polearm Mastery/i, ['pole']],
  [/Fist Weapon Mastery/i, ['fist', 'dualfist']],
  [/Dual Weapon Mastery/i, ['dual', 'dualdagger', 'dualblunt']],
  [/Two-handed Weapon Mastery/i, ['bigsword', 'bigblunt']],
  [/Blunt Mastery/i, ['blunt', 'bigblunt', 'dualblunt']],
];
const passives = {};
for (const [cls, c] of Object.entries(clsRaw)) {
  const learn = {};
  for (const table of [baseSched(cls), c.first || {}, c.sched || {}])
    for (const [L, rows] of Object.entries(table))
      for (const [sk, l] of rows) (learn[sk] = learn[sk] || []).push([+L, l]);
  passives[cls] = [];
  for (const [sk, list] of Object.entries(learn)) {
    if (!(PASS.test(c.groups[sk] || '') || (!c.groups[sk] && isPassiveType((skRaw[sk] || {}).type)))) continue;
    const s = skRaw[sk];
    if (!s || !Object.keys(s.lv).length) continue;
    list.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const lvUsed = new Set(list.map(x => x[1]));
    const lv = {}; for (const l of lvUsed) if (s.lv[l]) lv[l] = s.lv[l];
    const wt = (WEAPON_OF.find(([re]) => re.test(s.name)) || [])[1];
    passives[cls].push({ id: sk.split('-')[0], n: s.name, ic: (s.icon || '').replace(/\.png$/, ''), learn: list, lv, wt });
  }
}
const RACIAL = new Set(['964', '295']);
for (const [cls, pid] of Object.entries(NEW_PL)) {
  const g = (allRaw[cls] || {}).groups || {};
  const learn = plannerPassives(pid);
  if (!Object.keys(learn).length) continue;
  passives[cls] = [];
  for (const [id, list] of Object.entries(learn)) {
    const sk = keyById[id];
    const s = skRaw[sk];
    if (!s || !Object.keys(s.lv).length) continue;
    // Расовые пассивки со статами: Children of Shilen (тёмные эльфы), Iron Body (гномы).
    if (!(PASS.test(g[sk] || '') || RACIAL.has(id) || (!g[sk] && isPassiveType(s.type)))) continue;
    list.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const lv = {}; for (const [, l] of list) if (s.lv[l]) lv[l] = s.lv[l];
    const wt = (WEAPON_OF.find(([re]) => re.test(s.name)) || [])[1];
    passives[cls].push({ id, n: s.name, ic: (s.icon || '').replace(/\.png$/, ''), learn: list, lv, wt });
  }
}
// Мастерство оружия магов даёт ещё P. Atk. +45% и M. Atk. +17% — в тексте вики этого нет.
// Проценты работают только с оружием в руках: у голого персонажа Lu4 Planner даёт только плоскую прибавку.
const BOOK = { 758: "Spellbook: Fighter's Will", 759: "Spellbook: Archer's Will", 945: "Spellbook: Magician's Will" };
for (const list of Object.values(passives)) for (const p of list) if (BOOK[p.id]) p.book = BOOK[p.id];
const HIDDEN = { 249: ['With an equipped weapon:', 'P. Atk. +45%', 'M. Atk. +17%'], 250: ['With an equipped weapon:', 'P. Atk. +45%', 'M. Atk. +17%'] };
for (const list of Object.values(passives)) for (const p of list) if (HIDDEN[p.id]) for (const l in p.lv) p.lv[l] = [p.lv[l], ...HIDDEN[p.id]].join('\n');
fs.writeFileSync(R('data/passives.json'), JSON.stringify(passives));

// ---------------------------------------------------------------- баффы и тогглы (icon_type-2 и -6)
// Служебные умения без влияния на статы не показываем.
const SKIP_BUFF = new Set(['24314', '226', '1506', '1427', '1460', '1257', '24435']);
const buffMap = new Map();
const buffSrc = Object.assign({}, clsRaw);
for (const cls of Object.keys(NEW_PL)) if (allRaw[cls]) buffSrc[cls] = { groups: allRaw[cls].groups };
for (const [cls, c] of Object.entries(buffSrc)) {
  const learn = {};
  for (const table of [c.first || {}, c.sched || {}])
    for (const [L, rows] of Object.entries(table))
      for (const [sk, l] of rows) (learn[sk] = learn[sk] || []).push([+L, l]);
  for (const [sk, g] of Object.entries(c.groups)) {
    if (!/^icon_type-(2|6)$/.test(g)) continue;
    const s = skRaw[sk];
    const id = sk.split('-')[0];
    if (!s || !Object.keys(s.lv).length || SKIP_BUFF.has(id)) continue;
    // Баффы для саммонов и големов персонажу ничего не дают.
    if (/Servitor|Golem/i.test(s.name) || /the servitor's|to a servitor|Golem's/i.test(Object.values(s.lv).join(' '))) continue;
    let b = buffMap.get(id);
    if (!b) {
      const top = Math.max(...Object.keys(s.lv).map(Number));
      const lv = Array.from({ length: top }, (_, i) => s.lv[i + 1] || '');
      const text = lv.join('\n');
      const toggle = g === 'icon_type-6';
      // Кому действует: группа/клан, цель (есть дальность применения) или только на себя.
      let tgt = 'self';
      // Тип приходит и по-английски («Rhythm / Buff»), и по-русски («Ритм / Усиливающее»).
      if (/party|clan members/i.test(text) || /^(Rhythm|Ритм)/i.test(s.type || '')) tgt = 'party';
      else if (!toggle && s.st && s.st['Cast Range']) tgt = 'target';
      // Одинаковые эффекты не складываются: «Combines 'Might' and 'Shield'» у Improved Combat и Combat of Pa'agrio.
      const comb = text.match(/Combines '([^']+)' and '([^']+)'/);
      const stack = comb ? [comb[1], comb[2]].sort().join('+').toLowerCase() : s.name.replace(/^Mass\s+/i, '').toLowerCase();
      b = { id, n: s.name, ic: (s.icon || '').replace(/\.png$/, ''), cls: [], kind: toggle ? 'toggle' : 'buff', tgt, stack, dur: s.st && s.st.Duration, lv, learn: {} };
      buffMap.set(id, b);
    }
    b.cls.push(cls);
    b.learn[cls] = (learn[sk] || []).sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  }
}
const buffs = [...buffMap.values()];
// Группы баффов из Lu4 Planner (abnormalType): баффы одной группы не складываются, действует тот,
// у кого выше уровень эффекта (например, Legacy of Pa'agrio перекрывает Victory of Pa'agrio).
const ABN = fs.existsSync(R('data/raw/abnormal.json')) ? JSON.parse(fs.readFileSync(R('data/raw/abnormal.json'), 'utf8')) : {};
for (const b of buffs) {
  const a = ABN[b.id];
  if (!a || !a.length) continue;
  const at = i => a[Math.min(i, a.length - 1)];
  b.ab = b.lv.map((_, i) => at(i)[0] && at(i)[0] !== 'none' ? at(i)[0] : '');
  b.al = b.lv.map((_, i) => at(i)[1] || 0);
  if (b.ab.some(Boolean)) b.stack = b.ab.filter(Boolean).pop();
}

// ---------------------------------------------------------------- атакующие умения для калькулятора урона
// Список умений с уроном и их механика (время применения, перезарядка, база крита) — из расчёта Lu4 Planner,
// сила по уровням — со страниц умений на вики.
const skMeta = rawOr('skillmeta.json', { meta: {}, classes: {} });
const PLANNER_CLS = { paladin: 'paladin', bishop: 'bishop', elder: 'elder', swordsinger: 'swordsinger', overlord: 'overlord', hawkeye: 'hawkeye', silverranger: 'silver_ranger', phantomranger: 'phantom_ranger' };
// Урон по MP и умения только против нежити в PvP не нужны.
const NOT_PVP = new Set(['1102', '1210', '1398', '1399', '1031', '405', '1400', '49', '450']);
// Какое оружие нужно умению.
const SK_WEAPON = { 19: 'bow', 24: 'bow', 56: 'bow', 101: 'bow', 343: 'bow', 354: 'bow', 987: 'bow', 990: 'bow', 314: 'bow', 16: 'dagger', 223: 'dagger', 984: 'shield' };
const powerOf = t => {
  const m = String(t).match(/Power:\s*(\d[\d ]*)/i) || String(t).match(/(\d[\d ]*)\s*Power/i);
  return m ? +m[1].replace(/\s/g, '') : 0;
};
const attacks = {};
for (const [cls, c] of Object.entries(clsRaw)) {
  const learn = {};
  for (const table of [baseSched(cls), c.first || {}, c.sched || {}])
    for (const [L, rows] of Object.entries(table))
      for (const [sk, l] of rows) (learn[sk] = learn[sk] || []).push([+L, l]);
  const ids = new Set(((skMeta.classes || {})[PLANNER_CLS[cls]] || []).map(x => x.split(':')[0]));
  attacks[cls] = [];
  for (const [sk, list] of Object.entries(learn)) {
    const id = sk.split('-')[0];
    if (!ids.has(id) || NOT_PVP.has(id)) continue;
    const s = skRaw[sk];
    const m = skMeta.meta[id];
    if (!s || !m || m.err) continue;
    const pw = {};
    for (const [l, t] of Object.entries(s.lv)) { const p = powerOf(t); if (p) pw[l] = p; }
    if (!Object.keys(pw).length) continue;
    const text = Object.values(s.lv).slice(-1)[0] || '';
    const ign = (text.match(/Ignores (\d+)% of enemy's P\. Def/i) || [])[1];
    attacks[cls].push({
      id, n: s.name, ic: (s.icon || '').replace(/\.png$/, ''), learn: list.sort((a, b) => a[0] - b[0] || a[1] - b[1]), pw,
      magic: !!m.magic, hit: m.hit, reuse: m.reuse, cc: m.cc, cm: m.cm,
      mp: +(String((s.st || {}).Consumes || '').match(/\d+/) || [0])[0],
      noShield: /Ignores Shield Defen/i.test(text) || undefined, defIgn: ign ? +ign : undefined,
      blow: /Mortal Blow/.test(s.name) || undefined, weapon: SK_WEAPON[id],
    });
  }
  attacks[cls].sort((a, b) => a.learn[0][0] - b.learn[0][0]);
}
// Множитель умения из расчёта планнера («(сила + P. Atk.) × соска × k × 77 ÷ P. Def.»), например у звуковых атак.
const factorOf = m => { const x = String(m.sub || '').match(/^[\d.]+ × ([\d.]+) × (?:70|77) ÷/); return x && +x[1] !== 1 ? +x[1] : undefined; };
for (const a of Object.values(attacks).flat()) { const m = skMeta.meta[a.id]; if (m && factorOf(m)) a.k = factorOf(m); }
for (const [cls, pid] of Object.entries(NEW_PL)) {
  const list = (pj.skills || {})[pid];
  if (!list) continue;
  attacks[cls] = [];
  for (const x of list) {
    if (!x.dmg || NOT_PVP.has(x.id)) continue;
    const m = skMeta.meta[x.id] || (pj.meta || {})[x.id];
    const s = skRaw[keyById[x.id]];
    if (!s || !m || m.err || m.hit == null) continue;
    const learn = x.ml.map((L, i) => [L, i + 1]).filter(([L]) => L <= 75);
    if (!learn.length) continue;
    const pw = {};
    for (const [l, t] of Object.entries(s.lv)) { const p = powerOf(t); if (p) pw[l] = p; }
    if (!Object.keys(pw).length) continue;
    const text = Object.values(s.lv).slice(-1)[0] || '';
    const ign = (text.match(/Ignores (\d+)% of enemy's P\. Def/i) || [])[1];
    attacks[cls].push({
      id: x.id, n: s.name, ic: (s.icon || '').replace(/\.png$/, ''), learn, pw,
      magic: !!m.magic, hit: m.hit, reuse: m.reuse, cc: m.cc, cm: m.cm, k: factorOf(m),
      mp: +(String((s.st || {}).Consumes || '').match(/\d+/) || [0])[0],
      noShield: /Ignores Shield Defen/i.test(text) || undefined, defIgn: ign ? +ign : undefined,
      blow: /Blow|Backstab/.test(s.name) || undefined, weapon: SK_WEAPON[x.id] || (/ Shot$/.test(s.name) ? 'bow' : /Blow|Backstab|Stab/.test(s.name) ? 'dagger' : undefined),
    });
  }
  attacks[cls].sort((a, b) => a.learn[0][0] - b.learn[0][0]);
}

// HP/MP/CP по уровням для новых классов: голый персонаж из планнера минус Boost HP / Boost Mana, делённый на модификатор CON/MEN.
const hptab = rawOr('../hptab.json', {});
{
  const r2 = x => Math.round(x * 100) / 100;
  const CON = v => r2(Math.pow(1.03, v - 27.632)), MEN = v => r2(Math.pow(1.01, v + 0.06));
  // Безусловные проценты к Max HP/MP/CP из пассивок (например, Master of Combat: Max CP +5%) уже входят в расчёт планнера.
  const pctAt = (cls, L, key) => { let t = 0; for (const x of passives[cls] || []) { const l = x.learn.reduce((m, [a, b]) => (a <= L && b > m ? b : m), 0); if (!l) continue; for (const line of String(x.lv[l] || '').split('\n')) { if (/:\s*$/.test(line)) break; const mm = line.match(new RegExp('^Max\\.? ?' + key + ' \\+(\\d+(?:\\.\\d+)?)%')); if (mm) t += +mm[1]; } } return 1 + t / 100; };
  const flat = (cls, L, re) => { let t = 0; for (const x of passives[cls] || []) { if (!re.test(x.n)) continue; const l = x.learn.reduce((m, [a, b]) => (a <= L && b > m ? b : m), 0); if (!l) continue; const mm = (x.lv[l] || '').match(/by (\d+)/); if (mm) t += +mm[1]; } return t; };
  const cases = [];
  for (const [cls, pid] of Object.entries(NEW_PL)) {
    const cv = (pj.curve || {})[pid]; if (!cv || !cv[75]) continue;
    const tab = { hp: [], mp: [], cp: [] };
    for (let L = 1; L <= 75; L++) {
      const c = cv[L]; if (!c || !c.s) continue;
      tab.hp[L - 1] = +((c.s.hp / pctAt(cls, L, 'HP') - flat(cls, L, /Boost HP/)) / CON(c.pr.con)).toFixed(2);
      tab.mp[L - 1] = +((c.s.mp / pctAt(cls, L, 'MP') - flat(cls, L, /Boost Mana/)) / MEN(c.pr.men)).toFixed(2);
      tab.cp[L - 1] = +(c.s.cp / pctAt(cls, L, 'CP') / CON(c.pr.con)).toFixed(2);
      cases.push({ id: cls + '-naked-' + L, char: { cls, level: L, eq: {}, hen: [null, null, null], buffs: {} }, ref: c.s, primary: c.pr, passives: c.pas });
    }
    hptab[cls] = tab;
  }
  fs.writeFileSync(R('data/hptab.json'), JSON.stringify(hptab));
  fs.writeFileSync(R('data/raw/ref2.json'), JSON.stringify({ cases }));
}
// Удары кинжалом в расчёте планнера: «(сила × m + P. Atk. × соска) × 77 ÷ P. Def.» — соска не усиливает силу умения.
// Планнер считал с P. Atk. 2000 и соской ×2, отсюда m = (X − 4000) ÷ сила.
for (const a of Object.values(attacks).flat()) {
  const m = skMeta.meta[a.id] || (pj.meta || {})[a.id];
  const x = m && String(m.sub || '').match(/^([\d.]+) × 7[07] ÷/);
  if (!x) continue;
  a.blow = true;
  const p = a.pw[m.lv];
  const pm = p ? Math.round((+x[1] - 4000) / p * 100) / 100 : 1;
  a.pm = pm !== 1 ? pm : undefined;
}
fs.writeFileSync(R('data/attacks.json'), JSON.stringify(attacks));
console.log('attacks', Object.entries(attacks).map(([k, v]) => k + ':' + v.length).join(' '));
console.log('buffs', buffs.length, buffs.filter(b => b.tgt === 'party').length, 'party', buffs.filter(b => b.tgt === 'target').length, 'target');

// ---------------------------------------------------------------- клан-скилы (пассивные, 370–391), максимальный уровень
const clan = Object.entries(skRaw)
  .filter(([k, s]) => { const id = +k.split('-')[0]; return id >= 370 && id <= 391 && Object.keys(s.lv).length; })
  .map(([k, s]) => { const top = Math.max(...Object.keys(s.lv).map(Number)); return { id: k.split('-')[0], n: s.name, ic: (s.icon || '').replace(/\.png$/, ''), l: top, text: s.lv[top], lv: s.lv }; })
  .sort((a, b) => a.n.localeCompare(b.n));
fs.writeFileSync(R('data/clan.json'), JSON.stringify(clan));
console.log('clan skills', clan.length);
console.log('passives', Object.entries(passives).map(([k, v]) => k + ':' + v.length).join(' '));

// Бонус MP бижутерии — по данным сервера Lu4 (калькулятор Lu4 Planner); на вики его нет.
const JEWEL_MPB = { 'Majestic Earring': 25, 'Majestic Necklace': 33, 'Majestic Ring': 17, 'Phoenix Earring': 20, 'Phoenix Necklace': 26, 'Phoenix Ring': 13, 'Physical Ring of Queen Ant': 25, 'Magical Ring of Queen Ant': 25, 'Earring of Orfen': 35, 'Ring of Core': 25 };
for (const it of items) if (JEWEL_MPB[it.n] && ['ear', 'neck', 'ring'].includes(it.s)) it.st.mpb = JEWEL_MPB[it.n];
fs.writeFileSync(R('data/items.json'), JSON.stringify(items));
fs.writeFileSync(R('data/sets.json'), JSON.stringify(sets));
fs.writeFileSync(R('data/buffs.json'), JSON.stringify(buffs));
const iconList = [...new Set([...items.map(i => i.ic), ...buffs.map(b => b.ic), ...Object.values(passives).flat().map(p => p.ic), ...clan.map(c => c.ic), ...Object.values(attacks).flat().map(a => a.ic)].filter(Boolean))];
fs.writeFileSync(R('data/raw/icon-list.txt'), iconList.join('\n'));
console.log('items', items.length, 'sets', sets.length, 'buffs', buffs.length, 'icons', iconList.length);
console.log('slots', JSON.stringify(items.reduce((o, i) => ((o[i.s] = (o[i.s] || 0) + 1), o), {})));
console.log('unknown types', [...unknown.types].slice(0, 40));
console.log('unknown stats', [...unknown.stats]);
console.log('unknown enchant heads', [...unknown.heads]);
