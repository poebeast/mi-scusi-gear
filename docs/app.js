(function () {
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const h = (tag, attrs, ...kids) => {
    const el = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(kid));
    return el;
  };

  const DATA = window.MISCUSI_DATA || { items: [], sets: [], buffs: [], state: {} };
  let STATE = DATA.state || {};
  const icon = name => (name ? 'icons/' + encodeURIComponent(name) + '.png' : '');

  // ---------------------------------------------------------------- справочники
  const RACES = [['human', 'Human'], ['elf', 'Elf'], ['darkelf', 'Dark Elf'], ['orc', 'Orc'], ['dwarf', 'Dwarf']];
  const GENDERS = [['male', 'Male'], ['female', 'Female']];
  const CLASSES = {
    paladin:       { n: 'Paladin',        arch: 'fighter', race: 'human',   hp: 2500, mp: 900,  cpr: 0.62, accent: 0xe8c35a },
    bishop:        { n: 'Bishop',         arch: 'mystic',  race: 'human',   hp: 1700, mp: 1600, cpr: 0.5, accent: 0xcfe4ff },
    elder:         { n: 'Elven Elder',    arch: 'mystic',  race: 'elf',     hp: 1650, mp: 1700, cpr: 0.5, accent: 0x7fe3c4 },
    swordsinger:   { n: 'Swordsinger',    arch: 'fighter', race: 'elf',     hp: 2300, mp: 1000, cpr: 0.5, accent: 0x6fb2ff },
    overlord:      { n: 'Overlord',       arch: 'mystic',  race: 'orc',     hp: 2000, mp: 1500, cpr: 0.6, accent: 0xff8a3d },
    hawkeye:       { n: 'Hawkeye',        arch: 'fighter', race: 'human',   hp: 2100, mp: 800,  cpr: 0.8, archer: true, accent: 0xd8cf6a },
    silverranger:  { n: 'Silver Ranger',  arch: 'fighter', race: 'elf',     hp: 2000, mp: 850,  cpr: 0.7, archer: true, accent: 0xdfeeff },
    phantomranger: { n: 'Phantom Ranger', arch: 'fighter', race: 'darkelf', hp: 2000, mp: 850,  cpr: 0.7, archer: true, accent: 0xb37aff },
  };
  const CLASS_ICON = { paladin: 5, bishop: 16, elder: 30, swordsinger: 21, overlord: 51, hawkeye: 9, silverranger: 24, phantomranger: 37 };
  const ROSTER = ['paladin', 'bishop', 'elder', 'swordsinger', 'overlord', 'hawkeye', 'hawkeye', 'silverranger', 'phantomranger'];
  // Пол по умолчанию — как на официальном рендере класса.
  const CLASS_GENDER = { paladin: 'female', bishop: 'female', elder: 'female', swordsinger: 'female', overlord: 'male', hawkeye: 'female', silverranger: 'female', phantomranger: 'male' };

  // Базовые атрибуты шаблонов L2 (раса × архетип).
  const BASE_ATTR = {
    human:   { fighter: [40, 30, 43, 21, 11, 25], mystic: [22, 21, 27, 41, 20, 39] },
    elf:     { fighter: [36, 35, 36, 23, 14, 26], mystic: [21, 24, 25, 37, 23, 40] },
    darkelf: { fighter: [41, 34, 32, 25, 12, 26], mystic: [23, 23, 24, 44, 19, 37] },
    orc:     { fighter: [40, 26, 47, 18, 12, 27], mystic: [27, 24, 31, 31, 15, 42] },
    dwarf:   { fighter: [39, 29, 45, 20, 10, 27], mystic: [29, 22, 35, 32, 14, 35] },
  };
  const RUN = { human: [115, 120], elf: [125, 122], darkelf: [122, 122], orc: [117, 121], dwarf: [115, 115] };
  const ATTRS = ['STR', 'DEX', 'CON', 'INT', 'WIT', 'MEN'];

  const SLOTS = {
    head:   { n: 'Helmet',     kinds: ['head'] },
    chest:  { n: 'Armor',    kinds: ['chest', 'full'] },
    legs:   { n: 'Legs',    kinds: ['legs'] },
    gloves: { n: 'Gloves', kinds: ['gloves'] },
    feet:   { n: 'Boots',   kinds: ['feet'] },
    weapon: { n: 'Weapon',   kinds: ['weapon'] },
    shield: { n: 'Shield',      kinds: ['shield', 'sigil'] },
    neck:   { n: 'Necklace', kinds: ['neck'] },
    ear1:   { n: 'Earring',   kinds: ['ear'] },
    ear2:   { n: 'Earring',   kinds: ['ear'] },
    ring1:  { n: 'Ring',   kinds: ['ring'] },
    ring2:  { n: 'Ring',   kinds: ['ring'] },
  };
  const EMPTY_PDEF = { fighter: { head: 12, chest: 31, legs: 18, gloves: 8, feet: 7 }, mystic: { head: 12, chest: 15, legs: 8, gloves: 8, feet: 7 } };
  const EMPTY_MDEF = { neck: 13, ear1: 9, ear2: 9, ring1: 5, ring2: 5 };
  const ATK_SPD = { sword: 379, blunt: 379, dagger: 433, bow: 293, pole: 325, fist: 325, dualfist: 325, bigsword: 325, bigblunt: 325, staff: 325, bigstaff: 325, dual: 325, dualdagger: 433, dualblunt: 325, rapier: 406, ancientsword: 350 };
  const BASE_CRIT = { sword: 8, bigsword: 8, blunt: 4, bigblunt: 4, staff: 4, bigstaff: 4, dagger: 12, dualdagger: 12, bow: 12, pole: 8, fist: 4, dualfist: 4, dual: 8, dualblunt: 5, rapier: 10, ancientsword: 8 };
  const TWO_HANDED = new Set(['bow', 'pole', 'bigsword', 'bigblunt', 'staff', 'bigstaff', 'dual', 'dualdagger', 'dualblunt', 'dualfist', 'fist', 'ancientsword']);
  const GRADE_LVL = { B: 52, A: 61 };

  // Бонусы заточки сета (Lu4 Gamma, статья «Enchantment bonuses for sets»).
  const SET_ENCH = {
    B: { heavy: { 3: { pdef: 15, acc: 1 }, 4: { pdef: 25, acc: 1, mpreg: 1 }, 5: { pdef: 35, acc: 2, mpreg: 2 }, 6: { pdef: 50, acc: 3, mpreg: 3 } },
         light: { 3: { mdef: 12, eva: 1 }, 4: { mdef: 20, eva: 1, speed: 1 }, 5: { mdef: 28, eva: 2, speed: 2 }, 6: { mdef: 40, eva: 3, speed: 3 } },
         robe:  { 3: { pdef: 10, mdef: 6 }, 4: { pdef: 15, mdef: 10 }, 5: { pdef: 20, mdef: 14 }, 6: { pdef: 25, mdef: 20 } } },
    A: { heavy: { 3: { pdef: 25, acc: 1, mpreg: 1 }, 4: { pdef: 35, acc: 2, mpreg: 2 }, 5: { pdef: 50, acc: 3, mpreg: 3 }, 6: { pdef: 70, acc: 4, mpreg: 4 } },
         light: { 3: { mdef: 20, eva: 1, speed: 1 }, 4: { mdef: 28, eva: 2, speed: 2 }, 5: { mdef: 40, eva: 3, speed: 3 }, 6: { mdef: 56, eva: 4, speed: 4 } },
         robe:  { 3: { pdef: 13, mdef: 10 }, 4: { pdef: 18, mdef: 14 }, 5: { pdef: 25, mdef: 20 }, 6: { pdef: 35, mdef: 28 } } },
  };

  const STAT_LABEL = {
    patk: 'P. Atk.', matk: 'M. Atk.', pdef: 'P. Def.', mdef: 'M. Def.', acc: 'Accuracy', eva: 'Evasion',
    crit: 'Critical', aspd: 'Atk. Spd.', cspd: 'Casting Spd.', speed: 'Speed', hp: 'HP', mp: 'MP', cp: 'CP',
    critdmg: 'Crit. damage', mcrit: 'M. Critical', mcritdmg: 'M. crit. damage', hpreg: 'HP regen', mpreg: 'MP regen', sdef: 'Shield Def.',
  };

  // ---------------------------------------------------------------- индексы данных
  const ITEMS = new Map(DATA.items.map(it => [it.id, it]));
  const SETS = new Map((DATA.sets || []).map(s => [s.id, s]));
  const BUFFS = new Map((DATA.buffs || []).map(b => [b.id, b]));
  const VARIANTS = new Map();
  for (const it of DATA.items) {
    const k = it.base || it.id;
    if (!VARIANTS.has(k)) VARIANTS.set(k, []);
    VARIANTS.get(k).push(it);
  }

  // ---------------------------------------------------------------- разбор текстов эффектов
  const ALIASES = [
    [/^P\.?\s?Atk\.? when using a bow/i, 'patk', 'bow'],
    [/^(?:P\.\s)?Atk\.?\s?Spd\.?|^Attack Speed/i, 'aspd'],
    [/^Cast(?:ing)?\.?\s?(?:Spd|Speed)\.?/i, 'cspd'],
    [/^(?:P\.\s)?Crit(?:ical)?\.?\s?Damage|^P\.\s?Atk\.? on Crit/i, 'critdmg'],
    [/^M\.\s?Crit(?:ical)?\.?\s?(?:Rate|Chance)/i, 'mcrit'],
    [/^M\.\s?Crit(?:ical)?\.?\s?Damage/i, 'mcritdmg'],
    [/^(?:P\.\s)?Crit(?:ical)?\.?\s?(?:Rate|Chance)|^Crit\.?\s?Atk\.? Chance/i, 'crit'],
    [/^P\.\s?Atk\.?/i, 'patk'], [/^M\.\s?Atk\.?/i, 'matk'], [/^P\.\s?Def\.?/i, 'pdef'], [/^M\.\s?Def\.?/i, 'mdef'],
    [/^Accuracy/i, 'acc'], [/^Evasion/i, 'eva'], [/^(?:Movement |Run )?Speed/i, 'speed'],
    [/^Max\.?\s?HP/i, 'hp'], [/^Max\.?\s?MP/i, 'mp'], [/^Max\.?\s?CP/i, 'cp'],
    [/^HP (?:Regeneration|Recovery)/i, 'hpreg'], [/^MP (?:Regeneration|Recovery)/i, 'mpreg'],
    [/^Shield (?:Defen[cs]e|Def\.)/i, 'sdef'],
    [/^(STR|DEX|CON|INT|WIT|MEN)\b/, 'attr'],
  ];
  const fxCache = new Map();
  function parseFx(text) {
    if (!text) return { mods: [], notes: [] };
    if (fxCache.has(text)) return fxCache.get(text);
    const mods = [], notes = [];
    let cond = null;
    for (let line of String(text).split(/\n+/)) {
      line = line.trim();
      if (!line) continue;
      let lineCond = cond;
      const cm = line.match(/^(If a shield is equipped|Shield Equip Bonus|When HP\s*<\s*\d+%|For party members|Totally)\s*:\s*/i);
      if (cm) {
        const c = cm[1].toLowerCase();
        if (c.startsWith('if a shield') || c.startsWith('shield equip')) lineCond = 'shield';
        else if (c.startsWith('when hp')) { cond = 'lowhp'; lineCond = 'lowhp'; }
        else if (c === 'totally') { cond = 'skip'; lineCond = 'skip'; }
        line = line.slice(cm[0].length);
        if (!line) continue;
      }
      if (/when HP\s*</i.test(line) || /during a critical|from behind|chance to|when attacking|when using a (?:harmful|beneficial)/i.test(line)) { notes.push(line); continue; }
      let any = false;
      for (let chunk of line.split(/,\s*|\s+and\s+(?=[a-z]*\s*(?:[A-Z]|increases|decreases))/i)) {
        chunk = chunk.replace(/\.$/, '').replace(/^(?:additionally|increases|decreases)\s+/i, '').trim();
        if (!chunk) continue;
        let m = chunk.match(/^(.*?)\s*([+\-−–]\s?\d[\d ]*(?:[.,]\d+)?)\s*(%)?$/);
        if (!m) { const b = chunk.match(/^(.*?)\s+by\s+(\d[\d ]*(?:[.,]\d+)?)\s*(%)?$/i); if (b) m = [b[0], b[1], '+' + b[2], b[3]]; }
        if (!m) continue;
        const name = m[1].trim();
        const val = parseFloat(m[2].replace(/[−–]/, '-').replace(/\s/g, '').replace(',', '.'));
        for (const [re, key, sub] of ALIASES) {
          const mm = name.match(re);
          if (!mm) continue;
          if (lineCond !== 'skip') {
            const mod = { k: key === 'attr' ? mm[1].toUpperCase() : key, v: val, pct: !!m[3] };
            if (lineCond) mod.cond = lineCond;
            if (sub) mod.cond = sub;
            mods.push(mod);
          }
          any = true;
          break;
        }
      }
      if (!any) notes.push(line);
    }
    const r = { mods, notes };
    fxCache.set(text, r);
    return r;
  }

  // ---------------------------------------------------------------- состояние
  function blankChar(cls, i) {
    const c = CLASSES[cls];
    return { nick: '', cls, race: c.race, gender: CLASS_GENDER[cls] || 'male', level: 75, eq: {}, hen: [null, null, null], buffs: {} };
  }
  function normalizeState() {
    if (!STATE || !Array.isArray(STATE.chars) || STATE.chars.length !== ROSTER.length) {
      STATE = { v: 1, chars: ROSTER.map(blankChar), savedAt: null };
    }
    STATE.chars.forEach((c, i) => {
      if (!CLASSES[c.cls]) Object.assign(c, blankChar(ROSTER[i]));
      c.level = Math.max(1, Math.min(75, +c.level || 75));
      c.eq = c.eq || {}; c.hen = c.hen || [null, null, null]; c.buffs = c.buffs || {};
      for (const s in c.eq) if (!c.eq[s] || !ITEMS.has(c.eq[s].id)) delete c.eq[s];
      for (const b in c.buffs) if (!BUFFS.has(b)) delete c.buffs[b];
    });
  }
  normalizeState();

  let cur = 0;
  try { const v = +sessionStorage.getItem('miscusi.cur'); if (v >= 0 && v < ROSTER.length) cur = v; } catch (e) {}
  const ch = () => STATE.chars[cur];

  // ---------------------------------------------------------------- формулы
  const bonus = {
    STR: v => Math.pow(1.036, v - 34.845),
    INT: v => Math.pow(1.02, v - 31.375),
    DEX: v => Math.pow(1.009, v - 19.36),
    WIT: v => Math.pow(1.05, v - 20),
    CON: v => Math.pow(1.03, v - 27.632),
    MEN: v => Math.pow(1.01, v + 0.06),
  };
  const lvlMod = l => (l + 89) / 100;
  const curve = (b0, a, target, lvl) => {
    const k = (target - b0 - a * 74) / (74 * 74);
    const n = lvl - 1;
    return b0 + a * n + k * n * n;
  };
  function enchVal(arr, e) {
    if (!arr || !arr.length) return null;
    if (e < arr.length) return arr[e];
    const last = arr[arr.length - 1], step = arr.length > 1 ? arr[arr.length - 1] - arr[arr.length - 2] : 0;
    return last + step * (e - arr.length + 1);
  }
  function itemStat(it, key, e) {
    const tbl = it.en && it.en[key];
    const v = enchVal(tbl, e || 0);
    if (v != null) return v;
    return (it.st && it.st[key]) || 0;
  }

  function hennaMods(c) {
    const out = {};
    ATTRS.forEach(a => (out[a] = 0));
    for (const hn of c.hen) {
      if (!hn) continue;
      out[hn.up] += hn.n;
      out[hn.down] -= hn.kind === 'greater' ? hn.n : hn.n + 1;
    }
    ATTRS.forEach(a => { if (out[a] > 5) out[a] = 5; });
    return out;
  }

  function activeSets(c) {
    const res = [];
    const equippedIds = new Set(Object.values(c.eq).map(e => e.id));
    const eqBySlotId = {};
    for (const s in c.eq) eqBySlotId[c.eq[s].id] = c.eq[s];
    for (const set of SETS.values()) {
      const req = set.parts.filter(p => !p.shield);
      if (!req.length) continue;
      let ok = true, minE = 99;
      for (const p of req) {
        const hit = p.ids.find(id => equippedIds.has(id));
        if (!hit) { ok = false; break; }
        minE = Math.min(minE, eqBySlotId[hit].e || 0);
      }
      if (!ok) continue;
      const shield = set.parts.some(p => p.shield && p.ids.some(id => equippedIds.has(id)));
      res.push({ set, minE, shield });
    }
    return res;
  }

  function availableBuffs(c) {
    const party = new Set(STATE.chars.map(x => x.cls).filter(k => !CLASSES[k].archer));
    const groups = [];
    const seen = new Set();
    const own = DATA.buffs.filter(b => b.cls.includes(c.cls));
    const push = (key, title, sub, list) => {
      const l = list.filter(b => !seen.has(b.id));
      l.forEach(b => seen.add(b.id));
      if (l.length) groups.push({ key, title, sub, list: l });
    };
    push('self', CLASSES[c.cls].n, 'own skills', own);
    for (const k of Object.keys(CLASSES)) {
      if (!party.has(k) || k === c.cls) continue;
      push(k, CLASSES[k].n, 'party & target buffs', DATA.buffs.filter(b => b.cls.includes(k) && b.tgt !== 'self'));
    }
    return groups;
  }

  function compute(c) {
    const cls = CLASSES[c.cls];
    const arch = cls.arch;
    const lvl = c.level;
    const notes = [], warn = [];
    const base = BASE_ATTR[c.race][arch];
    const attrs = {};
    ATTRS.forEach((a, i) => (attrs[a] = base[i]));
    const hen = hennaMods(c);

    // Собираем все модификаторы: эффекты вещей, SA, сеты, заточка сетов, баффы.
    const mods = [];
    const addMods = (list, src) => list.forEach(m => mods.push(Object.assign({ src }, m)));
    const w = c.eq.weapon && ITEMS.get(c.eq.weapon.id);
    const wtype = w ? w.wt : null;
    const hasShield = !!(c.eq.shield && ITEMS.get(c.eq.shield.id));

    for (const s in c.eq) {
      const it = ITEMS.get(c.eq[s].id);
      if (!it) continue;
      if (it.fx) { const p = parseFx(it.fx); addMods(p.mods, it.n); p.notes.forEach(n => notes.push(n)); }
      if (GRADE_LVL[it.g] && lvl < GRADE_LVL[it.g]) warn.push(`${it.n}: ${it.g}-grade requires level ${GRADE_LVL[it.g]} — expect a grade penalty in game.`);
    }
    const sets = activeSets(c);
    for (const a of sets) {
      const p = parseFx(a.set.fx);
      addMods(p.mods.filter(m => m.cond !== 'shield' || a.shield), a.set.n);
      if (a.minE >= 3 && SET_ENCH[a.set.g] && SET_ENCH[a.set.g][a.set.at]) {
        const e = Math.min(6, a.minE);
        const tb = SET_ENCH[a.set.g][a.set.at][e];
        for (const k in tb) mods.push({ k, v: tb[k], pct: false, src: `${a.set.n} +${a.minE}` });
      }
    }
    for (const id in c.buffs) {
      const b = BUFFS.get(id);
      if (!b) continue;
      const lv = Math.min(c.buffs[id], b.lv.length);
      const p = parseFx(b.lv[lv - 1]);
      addMods(p.mods, b.n);
    }

    const live = mods.filter(m => !m.cond || (m.cond === 'shield' && hasShield) || (m.cond === 'bow' && wtype === 'bow'));
    for (const m of live) if (ATTRS.includes(m.k)) attrs[m.k] += m.v;
    ATTRS.forEach(a => { attrs[a] += hen[a]; attrs[a] = Math.max(1, attrs[a]); });

    const add = {}, mul = {};
    for (const m of live) {
      if (ATTRS.includes(m.k)) continue;
      if (m.pct) mul[m.k] = (mul[m.k] || 1) * (1 + m.v / 100);
      else add[m.k] = (add[m.k] || 0) + m.v;
    }
    const fin = (k, v) => v * (mul[k] || 1) + (add[k] || 0);

    const lm = lvlMod(lvl);
    const st = {};
    // HP / MP / CP: кривые по классу; бонус от заточки брони — плоско.
    let hpItems = 0;
    for (const s of ['head', 'chest', 'legs', 'gloves', 'feet', 'shield']) {
      const e = c.eq[s]; const it = e && ITEMS.get(e.id);
      if (it && it.en && it.en.hp) hpItems += enchVal(it.en.hp, e.e || 0) || 0;
    }
    const hpBase = curve(arch === 'fighter' ? 80 : 101, 10, cls.hp, lvl);
    const mpBase = curve(arch === 'fighter' ? 30 : 40, 4, cls.mp, lvl);
    st.hp = fin('hp', hpBase * bonus.CON(attrs.CON)) + hpItems;
    st.mp = fin('mp', mpBase * bonus.MEN(attrs.MEN));
    st.cp = fin('cp', hpBase * cls.cpr * bonus.CON(attrs.CON));

    const wE = c.eq.weapon ? c.eq.weapon.e || 0 : 0;
    const basePatk = w ? itemStat(w, 'patk', wE) : arch === 'fighter' ? 4 : 3;
    const baseMatk = w ? itemStat(w, 'matk', wE) : arch === 'fighter' ? 6 : 7;
    st.patk = fin('patk', basePatk * bonus.STR(attrs.STR) * lm);
    st.matk = fin('matk', baseMatk * Math.pow(bonus.INT(attrs.INT), 2) * lm * lm);

    let pdef = 0;
    const full = c.eq.chest && ITEMS.get(c.eq.chest.id) && ITEMS.get(c.eq.chest.id).s === 'full';
    for (const s of ['head', 'chest', 'legs', 'gloves', 'feet']) {
      const e = c.eq[s]; const it = e && ITEMS.get(e.id);
      if (it) pdef += itemStat(it, 'pdef', e.e || 0);
      else if (!(s === 'legs' && full)) pdef += EMPTY_PDEF[arch][s];
    }
    st.pdef = fin('pdef', pdef * lm);
    let mdef = 0;
    for (const s in EMPTY_MDEF) {
      const e = c.eq[s]; const it = e && ITEMS.get(e.id);
      mdef += it ? itemStat(it, 'mdef', e.e || 0) : EMPTY_MDEF[s];
    }
    st.mdef = fin('mdef', mdef * bonus.MEN(attrs.MEN) * lm);

    const sq = Math.sqrt(attrs.DEX) * 6 + lvl;
    st.acc = fin('acc', sq + (w && w.st && w.st.acc ? w.st.acc : 0));
    let armEva = 0;
    for (const s of ['head', 'chest', 'legs', 'gloves', 'feet', 'shield']) { const e = c.eq[s]; const it = e && ITEMS.get(e.id); if (it && it.st && it.st.eva) armEva += it.st.eva; }
    st.eva = fin('eva', sq + armEva);
    const critBase = w ? (w.st && w.st.crit) || BASE_CRIT[wtype] || 8 : 4;
    st.crit = Math.min(500, fin('crit', critBase * 10 * bonus.DEX(attrs.DEX)));
    const spdBase = w ? (w.st && w.st.aspd) || ATK_SPD[wtype] || 325 : 300;
    st.aspd = fin('aspd', spdBase * bonus.DEX(attrs.DEX));
    st.cspd = fin('cspd', 333 * bonus.WIT(attrs.WIT));
    st.speed = fin('speed', RUN[c.race][arch === 'fighter' ? 0 : 1] * bonus.DEX(attrs.DEX));
    st.mcrit = fin('mcrit', 5 * bonus.WIT(attrs.WIT)) / 10;
    if (hasShield) {
      const e = c.eq.shield, it = ITEMS.get(e.id);
      st.sdef = fin('sdef', itemStat(it, 'pdef', e.e || 0));
    }

    const misc = [];
    const miscKeys = ['critdmg', 'mcritdmg', 'hpreg', 'mpreg'];
    for (const k of miscKeys) {
      const a = add[k], mm = mul[k];
      const parts = [];
      if (a) parts.push((a > 0 ? '+' : '') + Math.round(a * 10) / 10);
      if (mm && mm !== 1) parts.push((mm > 1 ? '+' : '') + Math.round((mm - 1) * 1000) / 10 + '%');
      if (parts.length) misc.push([STAT_LABEL[k], parts.join(', ')]);
    }
    return { attrs, base: Object.fromEntries(ATTRS.map((a, i) => [a, base[i]])), st, misc, sets, warn, notes: [...new Set(notes)] };
  }

  // ---------------------------------------------------------------- общее сохранение
  // С настроенным Firebase каждый персонаж — отдельный документ parties/<partyId>/chars/c<i>:
  // правки разных персонажей не перетирают друг друга, изменения приходят всем сразу.
  // Без Firebase правки живут в браузере, а наборы переносятся экспортом/импортом.
  const CFG = window.MISCUSI_CONFIG || {};
  const LS_KEY = 'miscusi.state.v1';
  const clientId = Math.random().toString(36).slice(2, 10);
  let mode = 'local', syncState = 'idle', fs = null, charsRef = null;
  const pending = new Map();
  const fmtTime = iso => { try { return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };

  function saveLocal() { try { localStorage.setItem(LS_KEY, JSON.stringify(STATE)); } catch (e) {} }
  function loadLocal() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) { const st = JSON.parse(raw); if (st && Array.isArray(st.chars) && st.chars.length === ROSTER.length) { STATE = st; normalizeState(); } }
    } catch (e) {}
  }

  function markDirty() {
    STATE.savedAt = new Date().toISOString();
    saveLocal();
    if (mode !== 'firebase') { renderSave(); return; }
    const i = cur;
    clearTimeout(pending.get(i));
    pending.set(i, setTimeout(() => pushChar(i), 1200));
    syncState = 'saving'; renderSave();
  }
  async function pushChar(i) {
    pending.delete(i);
    try {
      await charsRef.doc('c' + i).set({ data: JSON.stringify(STATE.chars[i]), by: clientId, updatedAt: fs.FieldValue.serverTimestamp() });
      if (!pending.size) syncState = 'synced';
    } catch (e) {
      syncState = 'error';
      toast('Could not save to the shared database. Your changes are kept in this browser.');
    }
    renderSave();
  }

  function loadScript(src) {
    return new Promise((ok, bad) => { const el = document.createElement('script'); el.src = src; el.onload = ok; el.onerror = bad; document.head.append(el); });
  }
  async function connectFirebase() {
    if (!CFG.firebase || !CFG.partyId) { renderSave(); return; }
    try {
      const v = '10.12.2';
      await loadScript('https://www.gstatic.com/firebasejs/' + v + '/firebase-app-compat.js');
      await loadScript('https://www.gstatic.com/firebasejs/' + v + '/firebase-firestore-compat.js');
      const app = window.firebase.initializeApp(CFG.firebase);
      fs = window.firebase.firestore;
      charsRef = app.firestore().collection('parties').doc(CFG.partyId).collection('chars');
      mode = 'firebase'; syncState = 'connecting'; renderSave();
      let first = true;
      charsRef.onSnapshot(snap => {
        let touchedCur = false, any = false;
        snap.docChanges().forEach(ch => {
          const m = /^c(\d+)$/.exec(ch.doc.id); if (!m) return;
          const i = +m[1]; if (i >= STATE.chars.length || pending.has(i)) return;
          const d = ch.doc.data();
          if (!d || !d.data || d.data === JSON.stringify(STATE.chars[i])) return;
          try { STATE.chars[i] = JSON.parse(d.data); any = true; if (i === cur) touchedCur = true; } catch (e) {}
        });
        if (first) {
          first = false;
          // Пустая база: заливаем то, что есть в браузере.
          if (snap.empty) STATE.chars.forEach((_, i) => pushChar(i));
        }
        if (any) { normalizeState(); saveLocal(); if (touchedCur) renderAll(); else renderCharOptions(); }
        if (!pending.size) syncState = 'synced';
        renderSave();
      }, () => { syncState = 'error'; renderSave(); });
    } catch (e) {
      mode = 'local'; syncState = 'error';
      toast('Shared database is unavailable — working in this browser only.');
      renderSave();
    }
  }


  // ---------------------------------------------------------------- UI
  const root = $('#root');
  const tip = h('div', { class: 'tip', hidden: true });
  document.body.append(tip);
  function showTip(el, html) {
    tip.innerHTML = html; tip.hidden = false;
    const r = el.getBoundingClientRect();
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    let x = r.right + 8, y = r.top;
    if (x + tw > innerWidth - 8) x = r.left - tw - 8;
    if (x < 8) x = Math.max(8, Math.min(innerWidth - tw - 8, r.left));
    if (y + th > innerHeight - 8) y = innerHeight - th - 8;
    if (x === Math.max(8, Math.min(innerWidth - tw - 8, r.left))) y = r.bottom + 6 + th > innerHeight ? r.top - th - 6 : r.bottom + 6;
    tip.style.left = x + 'px'; tip.style.top = Math.max(8, y) + 'px';
  }
  const hideTip = () => { tip.hidden = true; };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  function toast(msg) {
    const t = h('div', { class: 'toast', role: 'status' }, msg);
    document.body.append(t);
    setTimeout(() => t.remove(), 3800);
  }

  const els = {};
  function layout() {
    root.innerHTML = '';
    const wrap = h('div', { class: 'wrap' });
    els.save = h('div', { class: 'save' });
    wrap.append(h('header', { class: 'top' },
      h('div', { class: 'brand' }, h('h1', null, 'Mi scusi'), h('span', null, 'Lu4 Gamma · party gear')),
      els.save));

    els.charSel = h('select', { id: 'char-select', onchange: e => { cur = +e.target.value; try { sessionStorage.setItem('miscusi.cur', String(cur)); } catch (_) {} renderAll(); } });
    els.nick = h('input', { id: 'char-nick', type: 'text', maxlength: '24', placeholder: 'In-game name', oninput: e => { ch().nick = e.target.value; renderCharOptions(); renderWho(); markDirty(); } });
    els.race = h('select', { id: 'char-race', onchange: e => { ch().race = e.target.value; update(true); } }, RACES.map(([v, n]) => h('option', { value: v }, n)));
    els.gender = h('select', { id: 'char-gender', onchange: e => { ch().gender = e.target.value; update(true); } }, GENDERS.map(([v, n]) => h('option', { value: v }, n)));
    els.lvlR = h('input', { id: 'char-level-range', type: 'range', min: '1', max: '75', oninput: e => setLevel(e.target.value) });
    els.lvlN = h('input', { id: 'char-level', type: 'number', min: '1', max: '75', onchange: e => setLevel(e.target.value) });
    wrap.append(h('section', { class: 'charbar' },
      h('div', { class: 'field' }, h('label', { for: 'char-select' }, 'Character'), els.charSel),
      h('div', { class: 'field' }, h('label', { for: 'char-nick' }, 'Name'), els.nick),
      h('div', { class: 'field' }, h('label', { for: 'char-race' }, 'Race'), els.race),
      h('div', { class: 'field' }, h('label', { for: 'char-gender' }, 'Gender'), els.gender),
      h('div', { class: 'field' }, h('label', { for: 'char-level' }, 'Level'), h('div', { class: 'lvl' }, els.lvlR, els.lvlN))));

    els.left = h('div', { class: 'paperdoll', 'aria-label': 'Equipment' });
    els.who = h('div', { class: 'who' });
    els.viewer = h('div', { class: 'viewer' }, els.who);
    els.tattoos = h('div', { class: 'tattoos' });
    els.stats = h('aside', { class: 'stats', 'aria-label': 'Stats' });
    wrap.append(h('div', { class: 'main' }, h('section', { class: 'stage' }, els.viewer, els.left), h('div', { class: 'side' }, els.stats, els.tattoos)));
    els.buffs = h('section', { class: 'sect', 'aria-label': 'Buffs' });
    wrap.append(els.buffs);
    wrap.append(h('p', { class: 'note foot' }, 'Item and skill data: masterwork.wiki, Lu4: Gamma. Base HP/MP/CP and racial attributes use standard L2 formulas and may differ from the server by a few percent; class passive skills are not included yet.'));
    root.append(wrap);

    els.dialog = h('dialog', { id: 'picker' });
    els.dialog.addEventListener('close', () => { els.dialog.innerHTML = ''; });
    document.body.append(els.dialog);

  }

  function setLevel(v) {
    const l = Math.max(1, Math.min(75, Math.round(+v || 1)));
    ch().level = l;
    els.lvlR.value = l; els.lvlN.value = l;
    renderStats(); markDirty();
  }

  function renderSave() {
    const s = els.save; if (!s) return;
    s.innerHTML = '';
    let cls = '', text;
    if (mode === 'firebase') {
      if (syncState === 'saving') { cls = ' dirty'; text = 'Saving…'; }
      else if (syncState === 'connecting') { cls = ' dirty'; text = 'Connecting…'; }
      else if (syncState === 'error') { cls = ' ro'; text = 'Sync problem — kept in this browser'; }
      else text = 'Live · shared with the party';
    } else {
      cls = ' ro';
      text = STATE.savedAt ? 'Saved in this browser ' + fmtTime(STATE.savedAt) : 'Saved in this browser';
    }
    s.append(h('span', { class: 'dot' + cls }), h('span', null, text));
  }

  function charLabel(c, i) {
    const cls = CLASSES[c.cls].n;
    const twin = ROSTER.filter(k => k === c.cls).length > 1 ? ' ' + (ROSTER.slice(0, i + 1).filter(k => k === c.cls).length) : '';
    return (c.nick ? c.nick + ' — ' : '') + cls + twin;
  }
  function renderCharOptions() {
    const sel = els.charSel;
    sel.innerHTML = '';
    STATE.chars.forEach((c, i) => sel.append(h('option', { value: i }, `${charLabel(c, i)} · ${c.level}`)));
    sel.value = cur;
  }
  function renderWho() {
    const c = ch();
    els.who.innerHTML = '';
    const worn = Object.keys(c.eq).length;
    const sets = activeSets(c);
    els.who.append(
      h('div', { class: 'portrait' },
        h('img', { class: 'head', src: 'icons/heads/' + c.race + '_' + c.gender + '.png', alt: '' }),
        h('img', { class: 'badge', src: icon('cls_' + CLASS_ICON[c.cls]), alt: CLASSES[c.cls].n })),
      h('b', null, c.nick || CLASSES[c.cls].n),
      h('small', null, `${CLASSES[c.cls].n} · ${RACES.find(r => r[0] === c.race)[1]} · ${c.gender === 'female' ? 'Female' : 'Male'} · Lv. ${c.level}`),
      h('div', { class: 'wornbar', role: 'img', 'aria-label': `${worn} of 12 slots equipped` }, Object.keys(SLOTS).map(s => h('i', { class: c.eq[s] ? 'on' : '' }))),
      h('span', { class: 'note' }, worn ? `${worn} of 12 slots equipped` : 'Nothing equipped yet — click a slot to pick an item'),
      h('div', { class: 'setchips' }, sets.map(x => h('span', { class: 'chip' }, x.set.n + (x.minE >= 3 ? ' +' + Math.min(x.minE, 6) : '')))));
  }

  function slotButton(slot) {
    const c = ch();
    const e = c.eq[slot];
    const it = e && ITEMS.get(e.id);
    const w = c.eq.weapon && ITEMS.get(c.eq.weapon.id);
    const chest = c.eq.chest && ITEMS.get(c.eq.chest.id);
    const locked = (slot === 'legs' && chest && chest.s === 'full') || (slot === 'shield' && w && TWO_HANDED.has(w.wt));
    const b = h('button', { class: 'slot' + (it ? ' filled' : ''), 'aria-label': SLOTS[slot].n + (it ? ': ' + it.n : ''), disabled: locked && !it ? true : null });
    if (it) {
      b.append(h('img', { src: icon(it.ic), alt: '' }));
      if (e.e) b.append(h('span', { class: 'en' }, '+' + e.e));
      b.append(h('span', { class: 'gr', style: `color:var(--g${it.g})` }, it.g));
      if (it.sa) b.append(h('span', { class: 'sa' }));
      b.addEventListener('mouseenter', () => showTip(b, itemTip(it, e.e || 0)));
      b.addEventListener('mouseleave', hideTip);
    } else {
      b.append(h('span', { class: 'ph' }, locked ? '—' : SLOTS[slot].n));
      if (locked) b.style.opacity = '.4';
    }
    b.addEventListener('click', () => { hideTip(); if (!locked || it) openPicker(slot); });
    return b;
  }
  function itemTip(it, e) {
    const lines = [];
    const k = [];
    if (it.c === 'weapon') k.push(`P. Atk. ${itemStat(it, 'patk', e)} · M. Atk. ${itemStat(it, 'matk', e)}`);
    if (it.st && it.st.pdef != null) k.push(`P. Def. ${itemStat(it, 'pdef', e)}`);
    if (it.st && it.st.mdef != null) k.push(`M. Def. ${itemStat(it, 'mdef', e)}`);
    if (it.en && it.en.hp && enchVal(it.en.hp, e)) k.push(`HP +${enchVal(it.en.hp, e)} from enchant`);
    if (it.sa) lines.push(`<div class="k">SA: ${esc(it.sa)}</div>`);
    if (it.fx) lines.push(`<div class="ln">${esc(it.fx)}</div>`);
    if (it.set && SETS.get(it.set)) lines.push(`<div class="k">Set: ${esc(SETS.get(it.set).n)}</div>`);
    return `<b>${esc(it.n)}${e ? ' +' + e : ''} <span class="gtag ${it.g}">${it.g}</span></b><div class="ln">${esc(k.join('\n'))}</div>${lines.join('')}`;
  }

  function renderSlots() {
    // Сетка снаряжения: бижутерия сверху, броня в середине, оружие и щит внизу.
    els.left.innerHTML = '';
    [[null, 'head', null], ['ear1', 'neck', 'ear2'], ['ring1', null, 'ring2'], ['gloves', 'chest', 'feet'], ['weapon', 'legs', 'shield']]
      .flat().forEach(s => els.left.append(s ? slotButton(s) : h('i', { class: 'gap' })));
  }

  function renderTattoos() {
    const c = ch();
    els.tattoos.innerHTML = '';
    els.tattoos.append(h('h3', null, 'Tattoos'));
    c.hen.forEach((hn, i) => {
      const b = h('button', { class: 'tat' + (hn ? '' : ' empty'), onclick: () => openTattoo(i) });
      if (hn) {
        const minus = hn.kind === 'greater' ? hn.n : hn.n + 1;
        b.append(h('span', { class: 'sym' }, hn.up), h('span', { class: 'txt', html: `<span class="p">${hn.up} +${hn.n}</span> <span class="m">${hn.down} −${minus}</span>` }));
      } else b.append(h('span', { class: 'sym' }, i + 1), h('span', { class: 'txt' }, 'Empty slot'));
      els.tattoos.append(b);
    });
    const hm = hennaMods(c);
    const over = c.hen.filter(Boolean).reduce((o, hn) => { o[hn.up] = (o[hn.up] || 0) + hn.n; return o; }, {});
    const capped = Object.keys(over).filter(k => over[k] > 5);
    if (capped.length) els.tattoos.append(h('span', { class: 'note' }, `${capped.join(', ')} bonus capped at +5.`));
    void hm;
  }

  let prevStats = null;
  function renderStats() {
    const c = ch();
    const r = compute(c);
    const S = r.st;
    const box = els.stats;
    box.innerHTML = '';
    const fmt = (v, d) => (d ? (Math.round(v * 10 ** d) / 10 ** d).toFixed(d) : Math.round(v).toLocaleString('en-GB'));
    const cls = (k, v) => { if (!prevStats || prevStats.cls !== c.cls + cur) return ''; const p = prevStats.st[k]; if (p == null) return ''; const a = Math.round(v), b = Math.round(p); return a > b ? 'up' : a < b ? 'dn' : ''; };

    box.append(h('div', { class: 'lbl' }, 'Stats'));
    const maxBar = Math.max(S.hp, S.mp, S.cp);
    box.append(h('div', { class: 'bars' },
      [['CP', S.cp, 'var(--cp)'], ['HP', S.hp, 'var(--hp)'], ['MP', S.mp, 'var(--mp)']].map(([n, v, col]) =>
        h('div', { class: 'bar' }, h('span', null, n), h('i', { style: `width:${Math.max(4, (v / maxBar) * 100)}%;background:${col}` }), h('b', null, fmt(v))))));
    const pairs = [['patk', 'P. Atk.'], ['matk', 'M. Atk.'], ['pdef', 'P. Def.'], ['mdef', 'M. Def.'], ['acc', 'Accuracy'], ['eva', 'Evasion'], ['crit', 'Critical'], ['aspd', 'Atk. Spd.'], ['cspd', 'Casting Spd.'], ['speed', 'Speed'], ['sdef', 'Shield Def.']];
    const g = h('div', { class: 'grid2' });
    for (const [k, n] of pairs) {
      if (S[k] == null) continue;
      g.append(h('div', { class: 'st' }, h('span', null, n), h('b', { class: cls(k, S[k]) }, k === 'mcrit' ? fmt(S[k], 1) : fmt(S[k]))));
    }
    if (g.children.length % 2) g.append(h('div', { class: 'st' }));
    box.append(g);
    box.append(h('div', { class: 'attrs' }, ATTRS.map(a => {
      const d = r.attrs[a] - r.base[a];
      return h('div', { class: 'attr', title: `Base ${r.base[a]}${d ? (d > 0 ? ' +' : ' ') + d : ''}` }, h('span', null, a), h('b', { class: d > 0 ? 'up' : d < 0 ? 'dn' : '' }, r.attrs[a]));
    })));
    if (r.sets.length) box.append(h('div', { class: 'misc' }, h('div', { class: 'lbl' }, 'Set bonus'), r.sets.map(a => h('div', null, h('span', null, a.set.n), h('b', null, a.minE >= 3 ? '+' + a.minE : 'complete')))));
    if (r.misc.length) box.append(h('div', { class: 'misc' }, r.misc.map(([n, v]) => h('div', null, h('span', null, n), h('b', null, v)))));
    r.warn.forEach(w => box.append(h('div', { class: 'warn' }, w)));
    if (r.notes.length) box.append(h('details', { class: 'note' }, h('summary', null, `Effects not counted in stats (${r.notes.length})`), h('div', { class: 'misc' }, r.notes.map(n => h('div', null, n)))));
    prevStats = { cls: c.cls + cur, st: S };
    renderCharOptions();
    renderWho();
  }

  function renderBuffs() {
    const c = ch();
    const box = els.buffs;
    box.innerHTML = '';
    const groups = availableBuffs(c);
    const activeCount = Object.keys(c.buffs).length;
    box.append(h('div', { class: 'secthead' },
      h('h3', null, 'Buffs'),
      h('span', { class: 'note' }, 'Own class skills plus buffs from party members (archers excluded). Click to apply at max level.'),
      h('button', { class: 'btn sm', disabled: !activeCount, onclick: () => { c.buffs = {}; update(false); } }, 'Remove all')));
    const wrap = h('div', { class: 'buffgroups' });
    for (const grp of groups) {
      const list = h('div', { class: 'bufflist' });
      for (const b of grp.list) {
        const on = c.buffs[b.id] != null;
        const lv = on ? c.buffs[b.id] : b.lv.length;
        const btn = h('button', { class: 'buff' + (on ? ' on' : ''), 'aria-pressed': on ? 'true' : 'false', 'aria-label': b.n },
          h('img', { src: icon(b.ic), alt: '' }), h('span', { class: 'lv' }, lv),
          b.tgt === 'party' ? h('span', { class: 'tg' }, 'PT') : b.kind === 'toggle' ? h('span', { class: 'tg' }, 'TG') : null);
        btn.addEventListener('click', () => toggleBuff(b));
        btn.addEventListener('mouseenter', () => showTip(btn, `<b>${esc(b.n)} · Lv. ${lv}</b><div class="ln">${esc(b.lv[lv - 1])}</div><div class="k">${b.tgt === 'party' ? 'Party' : b.tgt === 'target' ? 'Target' : 'Self'}${b.kind === 'toggle' ? ' · toggle' : ''}</div>`));
        btn.addEventListener('mouseleave', hideTip);
        list.append(btn);
      }
      wrap.append(h('div', { class: 'bg' }, h('h4', null, grp.title, h('small', null, grp.sub)), list));
    }
    if (!groups.length) wrap.append(h('div', { class: 'empty' }, 'No buffs available.'));
    box.append(wrap);

    if (activeCount) {
      const act = h('div', { class: 'active' });
      for (const id of Object.keys(c.buffs)) {
        const b = BUFFS.get(id);
        const sel = h('select', { 'aria-label': 'Level ' + b.n, onchange: e => { c.buffs[id] = +e.target.value; update(false); } },
          b.lv.map((_, i) => h('option', { value: i + 1, selected: c.buffs[id] === i + 1 ? true : null }, 'Lv. ' + (i + 1))));
        act.append(h('span', { class: 'chip' }, h('img', { src: icon(b.ic), alt: '' }), b.n, sel, h('button', { 'aria-label': 'Remove ' + b.n, onclick: () => { delete c.buffs[id]; update(false); } }, '×')));
      }
      box.append(h('div', { class: 'lbl', style: 'margin-top:12px' }, `Active: ${activeCount}`), act);
    }
  }

  // Одинаковые баффы не складываются: «Mass X» заменяет «X» и наоборот.
  const stackKey = n => n.replace(/^Mass\s+/i, '').trim().toLowerCase();
  function toggleBuff(b) {
    const c = ch();
    if (c.buffs[b.id] != null) delete c.buffs[b.id];
    else {
      for (const id of Object.keys(c.buffs)) { const o = BUFFS.get(id); if (o && stackKey(o.n) === stackKey(b.n)) delete c.buffs[id]; }
      c.buffs[b.id] = b.lv.length;
    }
    update(false);
  }

  function renderForm() {
    const c = ch();
    els.nick.value = c.nick || '';
    els.race.value = c.race; els.gender.value = c.gender;
    els.lvlR.value = c.level; els.lvlN.value = c.level;
  }
  function renderModel() { renderWho(); }

  function renderAll() {
    prevStats = null;
    renderForm(); renderSlots(); renderTattoos(); renderStats(); renderBuffs(); renderModel(); renderSave();
  }
  function update(model) {
    renderSlots(); renderTattoos(); renderStats(); renderBuffs();
    if (model !== false) renderModel();
    markDirty();
  }

  // ---------------------------------------------------------------- выбор предмета
  const pickerPrefs = { grade: 'all', q: '', type: 'all' };
  function openPicker(slot) {
    const c = ch();
    const dlg = els.dialog;
    const kinds = SLOTS[slot].kinds;
    const pool = DATA.items.filter(it => kinds.includes(it.s) && (!it.base || it.base === it.id || !ITEMS.has(it.base)));

    function draw() {
      dlg.innerHTML = '';
      const e = c.eq[slot];
      const curIt = e && ITEMS.get(e.id);
      const head = h('div', { class: 'dlghead' }, h('h2', null, SLOTS[slot].n), h('button', { class: 'btn sm', onclick: () => dlg.close() }, 'Close'));
      const box = h('div', { class: 'dlg' }, head);

      if (curIt) {
        const variants = VARIANTS.get(curIt.base || curIt.id) || [curIt];
        const curRow = h('div', { class: 'cur' },
          h('img', { src: icon(curIt.ic), alt: '' }),
          h('div', { class: 'nm' }, curIt.n, h('span', { class: 'gtag ' + curIt.g }, curIt.g), curIt.fnd ? h('span', { class: 'ftag' }, 'Foundation') : null),
          h('span', { class: 'lbl' }, 'Enchant'),
          h('span', { class: 'step' },
            h('button', { 'aria-label': 'Decrease enchant', onclick: () => { e.e = Math.max(0, (e.e || 0) - 1); changed(); } }, '−'),
            h('output', null, '+' + (e.e || 0)),
            h('button', { 'aria-label': 'Increase enchant', onclick: () => { e.e = Math.min(16, (e.e || 0) + 1); changed(); } }, '+')));
        if (variants.length > 1) {
          const sel = h('select', { id: 'sa-select', 'aria-label': 'Special ability (SA)', onchange: ev => { e.id = ev.target.value; changed(); } },
            variants.map(v => h('option', { value: v.id, selected: v.id === e.id ? true : null }, v.sa ? 'SA: ' + v.sa : 'No SA')));
          curRow.append(h('span', { class: 'lbl' }, 'SA'), sel);
        }
        curRow.append(h('button', { class: 'btn sm', onclick: () => { delete c.eq[slot]; changed(); dlg.close(); } }, 'Unequip'));
        box.append(curRow);
        if (curIt.fx) box.append(h('div', { class: 'fx' }, curIt.fx));
      }

      const q = h('input', { id: 'picker-search', type: 'search', placeholder: 'Search by name', value: pickerPrefs.q, oninput: ev => { pickerPrefs.q = ev.target.value; drawList(); } });
      const seg = (key, opts) => h('div', { class: 'seg', role: 'group' }, opts.map(([v, n]) => h('button', { class: pickerPrefs[key] === v ? 'on' : '', 'aria-pressed': pickerPrefs[key] === v ? 'true' : 'false', onclick: () => { pickerPrefs[key] = v; draw(); } }, n)));
      const tools = h('div', { class: 'dlgtools' }, q, seg('grade', [['all', 'All'], ['B', 'B'], ['A', 'A']]));
      const types = [...new Set(pool.map(it => it.at || it.wtn).filter(Boolean))];
      if (types.length > 1) tools.append(seg('type', [['all', 'Any type']].concat(types.map(t => [t, TYPE_RU[t] || t]))));
      box.append(tools);
      const list = h('div', { class: 'list', role: 'listbox', 'aria-label': 'Items' });
      box.append(list);
      dlg.append(box);

      function drawList() {
        list.innerHTML = '';
        const needle = pickerPrefs.q.trim().toLowerCase();
        const rows = pool.filter(it => (pickerPrefs.grade === 'all' || it.g === pickerPrefs.grade)
          && (pickerPrefs.type === 'all' || (it.at || it.wtn) === pickerPrefs.type || !types.includes(pickerPrefs.type))
          && (!needle || it.n.toLowerCase().includes(needle)))
          .sort((a, b) => (a.g === b.g ? 0 : a.g === 'A' ? -1 : 1) || mainVal(b) - mainVal(a) || a.n.localeCompare(b.n));
        if (!rows.length) { list.append(h('div', { class: 'empty' }, 'Nothing found. Clear a filter or change the search.')); return; }
        for (const it of rows) {
          const selected = curIt && (curIt.base || curIt.id) === (it.base || it.id);
          const row = h('button', { class: 'row' + (selected ? ' sel' : ''), role: 'option', 'aria-selected': selected ? 'true' : 'false' },
            h('img', { src: icon(it.ic), alt: '', loading: 'lazy' }),
            h('span', { class: 't' }, h('b', null, it.n, h('span', { class: 'gtag ' + it.g }, it.g), it.fnd ? h('span', { class: 'ftag' }, 'Foundation') : null, it.pvp ? h('span', { class: 'ftag' }, 'PvP') : null),
              h('small', null, [TYPE_RU[it.at || it.wtn] || '', it.set && SETS.get(it.set) ? 'set ' + SETS.get(it.set).n : '', (VARIANTS.get(it.base || it.id) || []).length > 1 ? 'has SA' : ''].filter(Boolean).join(' · '))),
            h('span', { class: 'v' }, mainText(it)));
          row.addEventListener('click', () => {
            const keepE = c.eq[slot] ? c.eq[slot].e || 0 : 0;
            c.eq[slot] = { id: it.id, e: keepE };
            if (slot === 'chest' && it.s === 'full') delete c.eq.legs;
            if (slot === 'weapon' && TWO_HANDED.has(it.wt)) delete c.eq.shield;
            changed();
          });
          list.append(row);
        }
      }
      drawList();
    }
    function changed() { update(true); if (dlg.open) { const st = dlg.querySelector('.list'); const sc = st ? st.scrollTop : 0; draw(); const nl = dlg.querySelector('.list'); if (nl) nl.scrollTop = sc; } }
    draw();
    if (!dlg.open) dlg.showModal();
  }
  const TYPE_RU = { heavy: 'Heavy', light: 'Light', robe: 'Robe', sword: 'Sword', bigsword: 'Two-handed sword', blunt: 'Blunt', bigblunt: 'Two-handed blunt', staff: 'Staff', bigstaff: 'Staff', dagger: 'Dagger', bow: 'Bow', pole: 'Polearm', fist: 'Fists', dualfist: 'Fists', dual: 'Dual swords', dualdagger: 'Dual daggers', dualblunt: 'Dual blunt', rapier: 'Rapier', ancientsword: 'Ancient sword' };
  function mainVal(it) { return it.c === 'weapon' ? (it.st.patk || 0) + (it.st.matk || 0) : (it.st.pdef || 0) + (it.st.mdef || 0); }
  function mainText(it) {
    if (it.c === 'weapon') return `${it.st.patk || 0} / ${it.st.matk || 0}`;
    if (it.st.mdef != null && it.s !== 'shield' && ['neck', 'ear', 'ring'].includes(it.s)) return `M.Def ${it.st.mdef}`;
    if (it.st.pdef != null) return `P.Def ${it.st.pdef}`;
    return '';
  }

  // ---------------------------------------------------------------- татуировки
  function openTattoo(i) {
    const c = ch();
    const dlg = els.dialog;
    const hn = c.hen[i] || { up: 'STR', down: 'CON', n: 4, kind: 'greater' };
    const pairs = { STR: ['CON', 'DEX'], CON: ['STR', 'DEX'], DEX: ['STR', 'CON'], INT: ['MEN', 'WIT'], MEN: ['INT', 'WIT'], WIT: ['INT', 'MEN'] };
    const draft = Object.assign({}, hn);
    function draw() {
      dlg.innerHTML = '';
      const minus = draft.kind === 'greater' ? draft.n : draft.n + 1;
      const up = h('select', { id: 'tat-up', onchange: e => { draft.up = e.target.value; if (!pairs[draft.up].includes(draft.down)) draft.down = pairs[draft.up][0]; draw(); } }, ATTRS.map(a => h('option', { value: a, selected: a === draft.up ? true : null }, a)));
      const down = h('select', { id: 'tat-down', onchange: e => { draft.down = e.target.value; draw(); } }, pairs[draft.up].map(a => h('option', { value: a, selected: a === draft.down ? true : null }, a)));
      const n = h('select', { id: 'tat-n', onchange: e => { draft.n = +e.target.value; draw(); } }, [1, 2, 3, 4].map(v => h('option', { value: v, selected: v === draft.n ? true : null }, '+' + v)));
      const kind = h('select', { id: 'tat-kind', onchange: e => { draft.kind = e.target.value; draw(); } },
        h('option', { value: 'greater', selected: draft.kind === 'greater' ? true : null }, 'Greater Dye (1:1)'),
        h('option', { value: 'normal', selected: draft.kind === 'normal' ? true : null }, 'Regular dye (+n −n−1)'));
      dlg.append(h('div', { class: 'dlg' },
        h('div', { class: 'dlghead' }, h('h2', null, `Tattoo ${i + 1}`), h('button', { class: 'btn sm', onclick: () => dlg.close() }, 'Close')),
        h('div', { class: 'tatform' },
          h('div', { class: 'field' }, h('label', { for: 'tat-up' }, 'Raises'), up),
          h('div', { class: 'field' }, h('label', { for: 'tat-n' }, 'By'), n),
          h('div', { class: 'field' }, h('label', { for: 'tat-down' }, 'Lowers'), down),
          h('div', { class: 'field' }, h('label', { for: 'tat-kind' }, 'Dye'), kind)),
        h('p', { class: 'note', style: 'padding:0 14px' }, `Result: ${draft.up} +${draft.n}, ${draft.down} −${minus}. Tattoos can raise an attribute by +5 at most.`),
        h('div', { class: 'dlgfoot' },
          c.hen[i] ? h('button', { class: 'btn', onclick: () => { c.hen[i] = null; dlg.close(); update(false); } }, 'Remove') : null,
          h('button', { class: 'btn primary', onclick: () => { c.hen[i] = Object.assign({}, draft); dlg.close(); update(false); } }, 'Apply'))));
    }
    draw();
    dlg.showModal();
  }

  // ---------------------------------------------------------------- старт
  loadLocal();
  layout();
  renderAll();
  connectFirebase();
})();
