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
  const RACE_ORDER = RACES.map(r => r[0]);
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
  // Остальные классы 2-й профессии — противники для калькулятора урона. HP/MP/CP берутся из таблицы hptab.
  [['gladiator', 'Gladiator', 'fighter', 'human', 2], ['warlord', 'Warlord', 'fighter', 'human', 3], ['darkavenger', 'Dark Avenger', 'fighter', 'human', 6],
   ['treasurehunter', 'Treasure Hunter', 'fighter', 'human', 8], ['sorcerer', 'Sorcerer', 'mystic', 'human', 12], ['necromancer', 'Necromancer', 'mystic', 'human', 13],
   ['warlock', 'Warlock', 'mystic', 'human', 14], ['prophet', 'Prophet', 'mystic', 'human', 17], ['templeknight', 'Temple Knight', 'fighter', 'elf', 20],
   ['plainwalker', 'Plains Walker', 'fighter', 'elf', 23], ['spellsinger', 'Spellsinger', 'mystic', 'elf', 27], ['elementalsummoner', 'Elemental Summoner', 'mystic', 'elf', 28],
   ['shillienknight', 'Shillien Knight', 'fighter', 'darkelf', 33], ['bladedancer', 'Bladedancer', 'fighter', 'darkelf', 34], ['abysswalker', 'Abyss Walker', 'fighter', 'darkelf', 36],
   ['spellhowler', 'Spellhowler', 'mystic', 'darkelf', 40], ['phantomsummoner', 'Phantom Summoner', 'mystic', 'darkelf', 41], ['shillienelder', 'Shillien Elder', 'mystic', 'darkelf', 43],
   ['destroyer', 'Destroyer', 'fighter', 'orc', 46], ['tyrant', 'Tyrant', 'fighter', 'orc', 48], ['warcryer', 'Warcryer', 'mystic', 'orc', 52],
   ['bountyhunter', 'Bounty Hunter', 'fighter', 'dwarf', 55], ['warsmith', 'Warsmith', 'fighter', 'dwarf', 57],
   // Terramancer (кастомная ветка гномов Lu4) на сервере использует шаблон гнома-воина — так в данных Lu4 Planner.
   ['terramancer', 'Terramancer', 'fighter', 'dwarf', 210]]
    .forEach(([k, n, arch, race, id]) => { CLASSES[k] = { n, arch, race, hp: arch === 'fighter' ? 2300 : 1700, mp: arch === 'fighter' ? 900 : 1600, cpr: 0.6 }; CLASS_ICON[k] = id; });
  // Противники: по одному персонажу каждого класса, порядок — по расам.
  const FOE_ORDER = Object.keys(CLASSES).sort((a, b) => RACE_ORDER.indexOf(CLASSES[a].race) - RACE_ORDER.indexOf(CLASSES[b].race) || (CLASSES[a].arch > CLASSES[b].arch ? 1 : CLASSES[a].arch < CLASSES[b].arch ? -1 : 0) || CLASS_ICON[a] - CLASS_ICON[b]);
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
  const ATK_SPD = { sword: 379, blunt: 379, dagger: 433, bow: 293, pole: 325, fist: 325, dualfist: 325, bigsword: 325, bigblunt: 325, staff: 379, bigstaff: 325, dual: 325, dualdagger: 400, dualblunt: 305, rapier: 406, ancientsword: 350 };
  const BASE_CRIT = { sword: 8, bigsword: 8, blunt: 4, bigblunt: 4, staff: 4, bigstaff: 4, dagger: 12, dualdagger: 12, bow: 12, pole: 8, fist: 4, dualfist: 4, dual: 8, dualblunt: 6, rapier: 10, ancientsword: 8 };
  const HIT_MOD = { sword: 0, bigsword: 0, dual: 0, blunt: 4.75, bigblunt: 4.75, dualblunt: 4.75, staff: 4.75, bigstaff: 4.75, fist: 4.75, dualfist: 4.75, dagger: -3.75, dualdagger: -3.75, bow: -3.75, pole: -3.75 };
  const RANDOM_DMG = { sword: 10, bigsword: 10, dual: 10, blunt: 20, bigblunt: 20, dualblunt: 20, staff: 20, bigstaff: 20, fist: 5, dualfist: 5, dagger: 5, dualdagger: 10, bow: 5, pole: 10 };
  const TWO_HANDED = new Set(['bow', 'pole', 'bigsword', 'bigblunt', 'staff', 'bigstaff', 'dual', 'dualdagger', 'dualblunt', 'dualfist', 'fist', 'ancientsword']);
  const GRADE_LVL = { B: 52, A: 64 };

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
    critdmg: 'Crit. damage', mcrit: 'M. Critical', mcritdmg: 'M. crit. damage', hpreg: 'HP regen', mpreg: 'MP regen', sdef: 'Shield Def.', reuse: 'Skills reuse', preuse: 'P. skills reuse', mreuse: 'M. skills reuse', hittime: 'Skills hit time', phittime: 'P. skills hit time',
  };

  // ---------------------------------------------------------------- индексы данных
  const ITEMS = new Map(DATA.items.map(it => [it.id, it]));
  const SETS = new Map((DATA.sets || []).map(s => [s.id, s]));
  const BUFFS = new Map((DATA.buffs || []).map(b => [b.id, b]));
  const PASSIVES = DATA.passives || {};
  const CLAN = DATA.clan || [];
  // Уровень пассивки на уровне персонажа: наибольший выученный не позже этого уровня.
  const passiveLevel = (p, lvl) => p.learn.reduce((m, [L, l]) => (L <= lvl && l > m ? l : m), 0);
  function activePassives(c) {
    const out = [];
    const w = c.eq.weapon && ITEMS.get(c.eq.weapon.id);
    const chest = c.eq.chest && ITEMS.get(c.eq.chest.id);
    const st = { wtype: w ? w.wt : null, hasShield: !!(c.eq.shield && ITEMS.get(c.eq.shield.id)), at: chest && chest.at };
    for (const p of PASSIVES[c.cls] || []) {
      const l = passiveLevel(p, c.level);
      if (!l) continue;
      const text = p.lv[l] || '';
      let off = '';
      let wtOff = false;
      if (p.wt && !(w && p.wt.includes(w.wt))) { off = 'needs a matching weapon'; wtOff = true; }
      if (!off) for (const line of text.split(/\n+/)) {
        // Часть «With any weapon:» действует всегда — пассивку целиком не выключаем.
        if (/^With any weapon/i.test(line)) break;
        const m = line.match(/^(?:Only\s+)?With ([^:]{1,60})\s*:/i);
        const cs = m && parseCond(m[1]);
        if (!cs || condOk(cs.join('+'), st)) continue;
        const need = cs.filter(x => !condOk(x, st)).map(x => x.startsWith('armor:') ? x.slice(6).split('|').join('/') + ' armor' : 'a matching weapon');
        off = 'needs ' + need.join(' and ');
        break;
      }
      const unlearned = !!(p.book && c.noBook && c.noBook[p.id]);
      if (unlearned) off = 'book not learned';
      out.push({ p, l, text, off, wtOff, unlearned });
    }
    return out;
  }
  const VARIANTS = new Map();
  for (const it of DATA.items) {
    const k = it.base || it.id;
    if (!VARIANTS.has(k)) VARIANTS.set(k, []);
    VARIANTS.get(k).push(it);
  }

  // ---------------------------------------------------------------- разбор текстов эффектов
  const ALIASES = [
    // Перезарядка и время применения умений (All — и физические, и магические).
    [/^All Skills Reuse Time/i, 'reuse'],
    [/^P\.\s?Skills? Reuse Time/i, 'preuse'],
    [/^M\.\s?Skills? Reuse Time/i, 'mreuse'],
    [/^(?:All )?Skills Hit Time/i, 'hittime'],
    [/^P\.\s?Skills? Hit Time/i, 'phittime'],
    [/^P\.?\s?Atk\.? when using a bow/i, 'patk', 'bow'],
    [/^(?:P\.\s)?Atk\.?\s?Spd\.? with Bow/i, 'aspd', 'bow'],
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
    [/^Shield (?:Defen[cs]e|Def\.) Rate/i, 'srate'],
    [/^Shield (?:Defen[cs]e|Def\.)(?: Power)?/i, 'sdef'],
    [/^(STR|DEX|CON|INT|WIT|MEN)\b/, 'attr'],
    [/^(?:Damage|Dmg\.?) in PvP|^PvP Damage/i, 'pvpdmg'],
    [/^P\.\s?Skills? Crit(?:ical)?\.? Damage/i, 'pskillcrit'],
    [/^P\.\s?Skills? Power/i, 'pskill'],
    [/^M\.\s?Skills? Power/i, 'mskill'],
    [/^Received P\.\s?Crit(?:ical)?\.? Damage/i, 'rcvcrit'],
    [/^Received M\.\s?Crit(?:ical)?\.? Damage/i, 'rcvmcrit'],
    [/^Received P\.\s?Crit(?:ical)?\.? Rate/i, 'rcvcc'],
  ];
  const WWORD = {
    sword: ['sword', 'bigsword'], 'two-handed sword': ['bigsword'], 'one-handed sword': ['sword'],
    blunt: ['blunt', 'bigblunt'], 'two-handed blunt': ['bigblunt'], 'one-handed blunt': ['blunt'],
    dagger: ['dagger'], 'dual dagger': ['dualdagger'], 'dual sword': ['dual'], 'dual blunt': ['dualblunt'],
    bow: ['bow'], polearm: ['pole'], pole: ['pole'], fist: ['fist', 'dualfist'], fists: ['fist', 'dualfist'],
    'dual fist': ['dualfist'], staff: ['staff', 'bigstaff'], rapier: ['rapier'], 'ancient sword': ['ancientsword'],
    'short-range weapon': ['sword', 'bigsword', 'blunt', 'bigblunt', 'dagger', 'dualdagger', 'dual', 'dualblunt', 'pole', 'fist', 'dualfist', 'staff', 'bigstaff', 'rapier', 'ancientsword'],
  };
  // «Light Armor and Dagger/Dual Dagger» → ['armor:light', 'w:dagger|dualdagger'].
  function parseCond(s) {
    const armor = [], weap = [];
    for (let part of s.split(/\s+and\s+|,\s*/i)) {
      part = part.trim().replace(/\.$/, '');
      if (!part) continue;
      const am = part.match(/^(Heavy|Light|Robe)(?:\s+Armor)?$/i);
      if (am) { armor.push(am[1].toLowerCase()); continue; }
      const w = [];
      for (const word of part.split('/')) { const k = WWORD[word.trim().toLowerCase().replace(/s$/, '')] || WWORD[word.trim().toLowerCase()]; if (k) w.push(...k); }
      if (!w.length) return null;
      weap.push(...w);
    }
    const out = [];
    if (armor.length) out.push('armor:' + [...new Set(armor)].join('|'));
    if (weap.length) out.push('w:' + [...new Set(weap)].join('|'));
    return out.length ? out : null;
  }
  const fxCache = new Map();
  function parseFx(text) {
    if (!text) return { mods: [], notes: [] };
    if (fxCache.has(text)) return fxCache.get(text);
    const mods = [], notes = [];
    let cond = null;
    for (let line of String(text).split(/\n+/)) {
      line = line.trim().replace(/^Clan members'\s*/i, '')
        // Единые названия для перезарядки: «P. and M. Skills» → All, ритмы на урон не влияют.
        .replace(/P\. and M\. Skills/gi, 'All Skills').replace(/Skills and Rhythms/gi, 'Skills')
        .replace(/Reuse Delay for magic by/gi, 'M. Skills Reuse Time by').replace(/Physical Skill Cooldown/gi, 'P. Skills Reuse Time');
      if (!line || /^Affects all clan members/i.test(line)) continue;
      let lineCond = cond;
      // «With Heavy Armor:», «With Light Armor and Dagger/Dual Dagger:» — условия по броне и оружию.
      const wm = line.match(/^(?:Only\s+)?(With|Without) ([^:]{1,60})\s*:\s*/i);
      if (wm) {
        let cs = /^any weapon$/i.test(wm[2].trim()) ? [] : parseCond(wm[2]);
        // «Without Robe Armor:» — штраф, если надета броня другого типа.
        if (cs && /^without/i.test(wm[1])) cs = cs.map(x => 'not:' + x);
        if (cs) { cond = cs.length ? cs.join('+') : null; lineCond = cond; line = line.slice(wm[0].length); if (!line) continue; }
      }
      line = line.replace(/^(?:For|Applies to) [^:]*members\s*:\s*/i, '');
      if (!line) continue;
      if (/\bchance\b.*:\s*$/i.test(line) || /^When attacked|^When HP is below|^When taking|^When using|^During |^With an? \d+% chance|^With \d+% chance|^When the (?:master|servitor)|servitor\b[^:]*:\s*$/i.test(line)) { cond = 'skip'; notes.push(line); continue; }
      const cm = line.match(/^(If a shield is equipped|Shield Equip Bonus|When HP\s*<\s*\d+%|For party members|Totally)\s*:\s*/i);
      if (cm) {
        const c = cm[1].toLowerCase();
        if (c.startsWith('if a shield') || c.startsWith('shield equip')) lineCond = 'shield';
        else if (c.startsWith('when hp')) { cond = 'lowhp'; lineCond = 'lowhp'; }
        else if (c === 'totally') { cond = 'skip'; lineCond = 'skip'; }
        line = line.slice(cm[0].length);
        if (!line) continue;
      }
      if (/when HP\s*<|when HP is below|(?:when|while) (?:running|sitting)/i.test(line) || /during a critical|from behind|chance to|when attacking|when using a (?:harmful|beneficial)/i.test(line)) { notes.push(line); continue; }
      let any = false, neg = false, last = null;
      for (let chunk of line.split(/,\s*|(?<=[\d%])\.\s+|\s+and\s+(?=[a-z]*\s*(?:[A-Z]|increases|decreases))/i)) {
        chunk = chunk.replace(/\.$/, '').replace(/^and\s+/i, '').trim();
        const dir = chunk.match(/^(?:additionally\s+)?(increases|decreases)\s+/i);
        if (dir) { neg = /^decreases/i.test(dir[1]); chunk = chunk.slice(dir[0].length); }
        chunk = chunk.replace(/^(?:additionally\s+|the user's\s+|nearby (?:party|clan) members'\s+)+/i, '').trim();
        if (!chunk) continue;
        let eqCond = null;
        const we = chunk.match(/^(.*?)\s+when equipped with\s+(?:a\s+)?(.+?)\.?$/i);
        if (we) { eqCond = parseCond(we[2]); if (!eqCond) { notes.push(line); continue; } chunk = we[1]; }
        let m = chunk.match(/^(.*?)\s*([+\-−–]\s?\d[\d ]*(?:[.,]\d+)?)\s*(%)?$/);
        if (!m) { const b = chunk.match(/^(.*?)\s+by\s+(\d[\d ]*(?:[.,]\d+)?)\s*(%)?(?:\s+(?:one-handed|two-handed|when|with|for)\b.*)?$/i); if (b) m = [b[0], b[1], (neg ? '-' : '+') + b[2], b[3]]; }
        if (!m) continue;
        let name = m[1].trim();
        let nameCond = null;
        const nc = name.match(/\s+(?:with|in|for|when using)\s+(?:a\s+)?(.+)$/i);
        if (nc) {
          nameCond = parseCond(nc[1].replace(/\s+shots?$/i, ''));
          if (!nameCond) { notes.push(line); continue; }
          nameCond = nameCond.join('+');
          name = name.slice(0, nc.index).trim();
        }
        const val = parseFloat(m[2].replace(/[−–]/, '-').replace(/\s/g, '').replace(',', '.'));
        if (!name && last) {
          if (lineCond !== 'skip') mods.push(Object.assign({}, last, { v: val, pct: !!m[3] }));
          any = true;
          continue;
        }
        for (const [re, key, sub] of ALIASES) {
          const mm = name.match(re);
          if (!mm) continue;
          if (lineCond !== 'skip') {
            const mod = { k: key === 'attr' ? mm[1].toUpperCase() : key, v: val, pct: !!m[3] };
            const cs = [lineCond, sub, nameCond, eqCond && eqCond.join('+')].filter(Boolean);
            if (cs.length) mod.cond = cs.join('+');
            mods.push(mod);
            last = mod;
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
  // Пол по умолчанию для остальных классов (как на их официальных рендерах).
  Object.assign(CLASS_GENDER, { gladiator: 'male', warlord: 'female', darkavenger: 'male', treasurehunter: 'female', sorcerer: 'female', necromancer: 'female', warlock: 'male', prophet: 'male', templeknight: 'male', plainwalker: 'female', spellsinger: 'female', elementalsummoner: 'male', shillienknight: 'female', bladedancer: 'male', abysswalker: 'female', spellhowler: 'female', phantomsummoner: 'female', shillienelder: 'female', destroyer: 'female', tyrant: 'male', warcryer: 'female', bountyhunter: 'female', warsmith: 'female', terramancer: 'male' });
  const raceLabel = c => RACES.find(r => r[0] === c.race)[1] + ' ' + (c.type === 'mystic' ? 'Mystic' : 'Fighter');
  function blankChar(cls, i) {
    const c = CLASSES[cls];
    return { nick: '', cls, race: c.race, type: c.arch, gender: CLASS_GENDER[cls] || 'male', level: 75, eq: {}, hen: [null, null, null], buffs: {} };
  }
  function normalizeState() {
    // Планнер: по одному персонажу на каждый класс 2-й профессии (STATE.foes[класс]).
    if (!STATE || typeof STATE !== 'object') STATE = {};
    STATE.v = 2; delete STATE.chars;
    STATE.foes = STATE.foes && typeof STATE.foes === 'object' ? STATE.foes : {};
    for (const k of FOE_ORDER) { const x = STATE.foes[k]; if (!x || x.cls !== k) STATE.foes[k] = blankChar(k); }
    for (const k in STATE.foes) if (!CLASSES[k]) delete STATE.foes[k];
    Object.values(STATE.foes).forEach(c => {
      c.level = Math.max(1, Math.min(75, +c.level || 75));
      // Тип расы (воин/маг) выбирается отдельно от класса.
      // Раса и тип (воин/маг) однозначно заданы классом.
      c.race = CLASSES[c.cls].race; c.type = CLASSES[c.cls].arch;
      c.eq = c.eq || {}; c.hen = c.hen || [null, null, null]; c.buffs = c.buffs || {}; c.clan = !!c.clan;
      // Уровень каждого клан-скила (1…макс), по умолчанию максимальный.
      c.clanLv = c.clanLv || {};
      // Пассивки из книг, которые персонаж не выучил.
      c.noBook = c.noBook || {};
      for (const k of CLAN) { const v = +c.clanLv[k.id]; c.clanLv[k.id] = v >= 1 && v <= k.l ? v : k.l; }
      // Старые наборы тату: урезаем плюсы сверх +5 на атрибут.
      const used = {};
      c.hen = c.hen.map(x => { if (!x) return null; const left = 5 - (used[x.up] || 0); if (left <= 0) return null; x.n = Math.min(x.n, left); used[x.up] = (used[x.up] || 0) + x.n; return x; });
      for (const s in c.eq) if (!c.eq[s] || !ITEMS.has(c.eq[s].id)) delete c.eq[s];
      for (const b in c.buffs) if (!BUFFS.has(b)) delete c.buffs[b];
    });
  }
  normalizeState();

  // cur — «f:<класс>»: персонаж этого класса.
  let cur = 'f:' + FOE_ORDER[0];
  const byKey = k => (typeof k === 'string' && k.startsWith('f:') ? STATE.foes[k.slice(2)] : undefined);
  try { const v = sessionStorage.getItem('miscusi.cur'); if (v && v.startsWith('f:') && CLASSES[v.slice(2)]) cur = v; } catch (e) {}
  const ch = () => byKey(cur);
  const isFoe = c => !!c;
  const keyOf = c => 'f:' + c.cls;

  // ---------------------------------------------------------------- формулы
  const r2 = x => Math.round(x * 100) / 100;
  const bonus = {
    STR: v => r2(Math.pow(1.036, v - 34.845)),
    INT: v => r2(Math.pow(1.02, v - 31.375)),
    DEX: v => r2(Math.pow(1.009, v - 19.36)),
    WIT: v => r2(Math.pow(1.05, v - 20)),
    CON: v => r2(Math.pow(1.03, v - 27.632)),
    MEN: v => r2(Math.pow(1.01, v + 0.06)),
  };
  // Базовые значения шаблона персонажа. Надетая вещь заменяет базу своего слота — так в игре
  // (сверено с окном персонажа). Калькулятор Lu4 Planner прибавляет базу всегда, в этом он ошибается.
  // P. Def.: 4 — бельё и плащ, их слотов у нас нет; остальное — EMPTY_PDEF по слотам.
  const TEMPLATE = { fighter: { patk: 4, matk: 6, pdef: 4 }, mystic: { patk: 3, matk: 6, pdef: 4 } };
  // HP/MP/CP по уровням до модификаторов CON/MEN (сверено с расчётом Lu4 Planner).
  const HPTAB = DATA.hptab || {};
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
    // Обычный и редкий вариант одного сета дают одинаковый бонус — засчитываем один раз, предпочитая редкий.
    const byName = new Map();
    for (const r of res) {
      const k = r.set.n.replace(' (Rare)', '');
      const prev = byName.get(k);
      if (!prev || (/(Rare)/.test(r.set.n) && !/(Rare)/.test(prev.set.n))) byName.set(k, r);
    }
    return [...byName.values()];
  }

  function casterLevel(b, k, c) {
    // У противника заклинатель неизвестен — берём уровень умения на 75.
    // Уровень баффа — по уровню персонажа этого класса.
    const caster = k === c.cls ? c : STATE.foes[k];
    const learn = (b.learn && b.learn[k]) || [];
    if (!learn.length) return b.lv.length;
    return Math.max(1, Math.min(b.lv.length, passiveLevel({ learn }, caster ? caster.level : 75)));
  }
  function availableBuffs(c) {
    const party = new Set(Object.keys(CLASSES).filter(k => !CLASSES[k].archer));
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

  // Все условия эффекта должны выполняться: броня, оружие, щит.
  function condOk(cond, s) {
    return String(cond).split('+').every(x => {
      if (x === 'shield') return s.hasShield;
      if (x === 'bow') return s.wtype === 'bow';
      if (x.startsWith('not:armor:')) return !!s.at && !x.slice(10).split('|').includes(s.at);
      if (x.startsWith('armor:')) return !!s.at && x.slice(6).split('|').includes(s.at);
      if (x.startsWith('w:')) return !!s.wtype && x.slice(2).split('|').includes(s.wtype);
      return false;
    });
  }
  function compute(c) {
    const cls = CLASSES[c.cls];
    const arch = c.type || cls.arch;
    const lvl = c.level;
    const notes = [], warn = [];
    const base = BASE_ATTR[c.race][arch];
    const attrs = {};
    ATTRS.forEach((a, i) => (attrs[a] = base[i]));
    const hen = hennaMods(c);

    // Собираем все модификаторы: эффекты вещей, SA, сеты, заточка сетов, баффы.
    const mods = [];
    // sid — номер источника (пассивка, вещь, сет, клан-скил, бафф): проценты разных источников перемножаются.
    let srcN = 0;
    const addMods = (list, src) => { const sid = ++srcN; list.forEach(m => mods.push(Object.assign({ src, sid }, m))); };
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
    // Пассивки класса: с подходящим оружием; условия по броне проверяются ниже, в live.
    const pass = activePassives(c);
    for (const x of pass) {
      if (x.wtOff || x.unlearned) continue;
      addMods(parseFx(x.text).mods, x.p.n);
    }
    // Клан-скилы максимального уровня, если включены у персонажа.
    if (c.clan) for (const k of CLAN) addMods(parseFx(clanText(k, c.clanLv[k.id])).mods, k.n);
    const over = buffOverrides(c);
    for (const id in c.buffs) {
      const b = BUFFS.get(id);
      if (!b || over[id]) continue;
      const lv = Math.min(c.buffs[id], b.lv.length);
      const p = parseFx(b.lv[lv - 1]);
      addMods(p.mods, b.n);
    }

    const chestIt = c.eq.chest && ITEMS.get(c.eq.chest.id);
    const live = mods.filter(m => !m.cond || condOk(m.cond, { wtype, hasShield, at: chestIt && chestIt.at }));
    for (const m of live) if (ATTRS.includes(m.k)) attrs[m.k] += m.v;
    ATTRS.forEach(a => { attrs[a] += hen[a]; attrs[a] = Math.max(1, attrs[a]); });

    // Проценты внутри одного источника складываются, а разные источники (каждая пассивка, вещь, сет,
    // клан-скил и бафф) перемножаются — так считает сервер. Сверено с Lu4 Planner: Casting Spd. Spellsinger
    // без баффов ×1.10 × 1.05 × 1.15 × 1.05 = 1.3947, с Rhythm of Rage и Victory ещё ×1.3 × 1.08.
    const add = {}, mul = {}, bySrc = {};
    for (const m of live) {
      if (ATTRS.includes(m.k)) continue;
      if (!m.pct) { add[m.k] = (add[m.k] || 0) + m.v; continue; }
      const g = bySrc[m.k] = bySrc[m.k] || {};
      g[m.sid] = (g[m.sid] || 0) + m.v / 100;
    }
    for (const k in bySrc) for (const id in bySrc[k]) mul[k] = (mul[k] || 1) * (1 + bySrc[k][id]);
    const prod = mul;
    const fin = (k, v) => v * (mul[k] || 1) + (add[k] || 0);

    const lm = lvlMod(lvl);
    const st = {};
    // HP / MP / CP: кривые по классу; бонус от заточки брони — плоско.
    let hpItems = 0, mpItems = 0;
    for (const s of ['head', 'chest', 'legs', 'gloves', 'feet', 'shield', 'neck', 'ear1', 'ear2', 'ring1', 'ring2']) {
      const e = c.eq[s]; const it = e && ITEMS.get(e.id);
      if (it && it.en && it.en.hp) hpItems += enchVal(it.en.hp, e.e || 0) || 0;
      if (it && it.st && it.st.mpb) mpItems += it.st.mpb;
    }
    const tab = HPTAB[c.cls];
    const hpBase = tab ? tab.hp[lvl - 1] : curve(arch === 'fighter' ? 80 : 101, 10, cls.hp, lvl);
    const mpBase = tab ? tab.mp[lvl - 1] : curve(arch === 'fighter' ? 30 : 40, 4, cls.mp, lvl);
    const cpBase = tab ? tab.cp[lvl - 1] : hpBase * cls.cpr;
    // Бонусы HP/MP самих вещей входят в базу и усиливаются процентными эффектами.
    st.hp = fin('hp', hpBase * bonus.CON(attrs.CON) + hpItems);
    st.mp = fin('mp', mpBase * bonus.MEN(attrs.MEN) + mpItems);
    st.cp = fin('cp', cpBase * bonus.CON(attrs.CON));

    const wE = c.eq.weapon ? c.eq.weapon.e || 0 : 0;
    const T = TEMPLATE[arch];
    const basePatk = w ? itemStat(w, 'patk', wE) : T.patk;
    const baseMatk = w ? itemStat(w, 'matk', wE) : T.matk;
    st.patk = fin('patk', basePatk * bonus.STR(attrs.STR) * lm);
    st.matk = fin('matk', baseMatk * Math.pow(bonus.INT(attrs.INT), 2) * lm * lm);

    let pdef = T.pdef;
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
    st.acc = fin('acc', sq + (w ? (HIT_MOD[wtype] != null ? HIT_MOD[wtype] : (w.st && w.st.acc) || 0) : 0));
    let armEva = 0;
    for (const s of ['head', 'chest', 'legs', 'gloves', 'feet', 'shield']) { const e = c.eq[s]; const it = e && ITEMS.get(e.id); if (it && it.st && it.st.eva) armEva += it.st.eva; }
    st.eva = fin('eva', sq + armEva);
    const critBase = w ? (w.st && w.st.crit) || BASE_CRIT[wtype] || 8 : 4;
    st.crit = Math.min(500, fin('crit', critBase * 10 * bonus.DEX(attrs.DEX)));
    const spdBase = w ? (w.st && w.st.aspd) || ATK_SPD[wtype] || 325 : 300;
    st.aspd = fin('aspd', spdBase * bonus.DEX(attrs.DEX));
    st.cspd = fin('cspd', 333 * bonus.WIT(attrs.WIT));
    st.speed = fin('speed', RUN[c.race][arch === 'fighter' ? 0 : 1] * bonus.DEX(attrs.DEX));
    // Шанс маг. крита, %: 5 × WIT, проценты баффов перемножаются, «M. Crit. Rate +N» прибавляется в конце.
    st.mcrit = 5 * bonus.WIT(attrs.WIT) * (prod.mcrit || 1) + (add.mcrit || 0);
    if (hasShield) {
      const e = c.eq.shield, it = ITEMS.get(e.id);
      st.sdef = fin('sdef', itemStat(it, 'pdef', e.e || 0));
      if (it.st && it.st.srate) st.srate = fin('srate', it.st.srate);
    }

    const misc = [];
    const miscKeys = ['critdmg', 'mcritdmg', 'hpreg', 'mpreg', 'reuse', 'preuse', 'mreuse', 'hittime', 'phittime'];
    for (const k of miscKeys) {
      const a = add[k], mm = mul[k];
      const parts = [];
      if (a) parts.push((a > 0 ? '+' : '') + Math.round(a * 10) / 10);
      if (mm && mm !== 1) parts.push((mm > 1 ? '+' : '') + Math.round((mm - 1) * 1000) / 10 + '%');
      if (parts.length) misc.push([STAT_LABEL[k], parts.join(', ')]);
    }
    return { attrs, base: Object.fromEntries(ATTRS.map((a, i) => [a, base[i]])), st, misc, sets, warn, pass, add, mul, prod, notes: [...new Set(notes)] };
  }

  // ---------------------------------------------------------------- общее сохранение
  // С настроенным Firebase каждый персонаж — отдельный документ parties/<partyId>/chars/c<i>:
  // правки разных персонажей не перетирают друг друга, изменения приходят всем сразу.
  // Без Firebase правки живут в браузере, а наборы переносятся экспортом/импортом.
  const CFG = window.MISCUSI_CONFIG || {};
  const LS_KEY = 'miscusi.state.v2';
  const clientId = Math.random().toString(36).slice(2, 10);
  let mode = 'local', syncState = 'idle', fs = null;
  const pending = new Map();
  const fmtTime = iso => { try { return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };

  function saveLocal() { try { localStorage.setItem(LS_KEY, JSON.stringify(STATE)); } catch (e) {} }
  function loadLocal() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) { const st = JSON.parse(raw); if (st && st.foes) { STATE = st; normalizeState(); } }
    } catch (e) {}
  }

  let foesRef = null, foesShared = true;
  function markDirty(who) {
    STATE.savedAt = new Date().toISOString();
    saveLocal();
    if (mode !== 'firebase') { renderSave(); return; }
    const key = who ? keyOf(who) : cur;
    if (typeof key === 'string') {
      // Противники хранятся отдельно; если база их не принимает — остаются в этом браузере.
      const k = key;
      if (!foesShared) { renderSave(); return; }
      clearTimeout(pending.get(k));
      pending.set(k, setTimeout(() => pushFoe(k.slice(2)), 1200));
      syncState = 'saving'; renderSave();
      return;
    }
  }
  async function pushFoe(k) {
    pending.delete('f:' + k);
    try {
      await foesRef.doc(k).set({ data: JSON.stringify(STATE.foes[k]), by: clientId, updatedAt: fs.FieldValue.serverTimestamp() });
    } catch (e) {
      foesShared = false;
      toast('Opponents are not shared yet — they are kept in this browser.');
    }
    if (!pending.size) syncState = 'synced';
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
      foesRef = app.firestore().collection('parties').doc(CFG.partyId).collection('foes');
      let first = true;
      foesRef.onSnapshot(snap => {
        let touchedCur = false, any = false;
        // Пустая база: заливаем персонажей, у которых что-то уже настроено.
        if (first) { first = false; if (snap.empty) for (const k in STATE.foes) { const c = STATE.foes[k]; if (c.nick || Object.keys(c.eq).length || Object.keys(c.buffs).length) pushFoe(k); } }
        snap.docChanges().forEach(chg => {
          const k = chg.doc.id;
          if (!CLASSES[k] || pending.has('f:' + k)) return;
          const d = chg.doc.data();
          if (!d || !d.data || d.data === JSON.stringify(STATE.foes[k])) return;
          try { const v = JSON.parse(d.data); if (v.cls !== k) return; STATE.foes[k] = v; any = true; if (cur === 'f:' + k) touchedCur = true; } catch (e) {}
        });
        if (any) { normalizeState(); saveLocal(); if (touchedCur) renderAll(); else { renderCharOptions(); renderDamage(); } }
        if (!pending.size) syncState = 'synced';
        renderSave();
      }, () => { foesShared = false; syncState = 'error'; renderSave(); });
      mode = 'firebase'; syncState = 'connecting'; renderSave();
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
    // Выбор варианта дизайна (временно, пока выбираем).
    wrap.append(h('header', { class: 'top' },
      h('div', { class: 'brand' }, h('h1', null, 'Mi scusi'), h('span', null, 'Lu4 Gamma')),
      // Кнопка инструкции мигает, пока её ни разу не открыли в этом браузере.
      h('a', { class: 'btn sm guidebtn' + (guideSeen() ? '' : ' blink'), href: 'guide.html', target: '_blank', rel: 'noopener', onclick: e => { try { localStorage.setItem('miscusi.guideSeen', '1'); } catch (_) {} e.currentTarget.classList.remove('blink'); } }, 'Guide'),
      els.save));

    els.charSel = h('select', { id: 'char-select', onchange: e => { cur = e.target.value; try { sessionStorage.setItem('miscusi.cur', String(cur)); } catch (_) {} renderAll(); } });
    els.nick = h('input', { id: 'char-nick', type: 'text', maxlength: '24', placeholder: 'In-game name', oninput: e => { ch().nick = e.target.value; renderCharOptions(); renderWho(); markDirty(); } });
    els.lvlR = h('input', { id: 'char-level-range', type: 'range', min: '1', max: '75', oninput: e => setLevel(e.target.value) });
    els.lvlN = h('input', { id: 'char-level', type: 'number', min: '1', max: '75', onchange: e => setLevel(e.target.value) });
    wrap.append(h('section', { class: 'charbar' },
      h('div', { class: 'field' }, h('label', { for: 'char-select' }, 'Character'), els.charSel),
      h('div', { class: 'field' }, h('label', { for: 'char-nick' }, 'Name'), els.nick),
      h('div', { class: 'field' }, h('label', { for: 'char-level' }, 'Level'), h('div', { class: 'lvl' }, els.lvlR, els.lvlN))));

    els.gear = h('div', { class: 'gearrow', 'aria-label': 'Equipment' });
    els.who = h('div', { class: 'who' });
    els.viewer = h('div', { class: 'viewer' }, els.who);
    els.tattoos = h('div', { class: 'tattoos' });
    els.clan = h('div', { class: 'clan' });
    els.passives = h('div', { class: 'passives' });
    els.stats = h('aside', { class: 'stats', 'aria-label': 'Stats' });
    els.buffs = h('section', { class: 'sect', 'aria-label': 'Buffs' });
    els.dmg = h('section', { class: 'sect dmg', 'aria-label': 'Damage' });
    // Блоки раскладываются по рядам и колонкам в зависимости от варианта дизайна.
    els.lay = h('div', { class: 'lay' });
    wrap.append(els.lay);
    applyLayout();
    wrap.append(h('p', { class: 'note foot' }, 'Item and skill data: masterwork.wiki, Lu4: Gamma. Base HP/MP/CP and racial attributes use standard L2 formulas and may differ from the server by a few percent.'));
    root.append(wrap);

    els.dialog = h('dialog', { id: 'picker' });
    els.dialog.addEventListener('close', () => { if (!els.dialog.open) document.body.classList.remove('picking'); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && els.dialog.open) els.dialog.close(); });
    document.body.append(els.dialog);

  }

  // Раскладка (дизайн «Smoke»): сверху персонаж и гир на всю ширину, ниже статы · урон · тату, пассивки, клан, внизу баффы.
  // Ряды: [колонки, ячейки]; ячейка — список блоков, {g: [...]} — блоки в общей карточке.
  const LAYOUT = [['1fr', [[{ g: ['viewer', 'gear'] }]]], ['300px minmax(0,1fr) 270px', [['stats'], ['dmg'], ['tattoos', 'passives', 'clan']]], ['1fr', [['buffs']]]];
  function applyLayout() {
    els.lay.innerHTML = '';
    for (const [cols, cells] of LAYOUT) {
      const row = h('div', { class: 'lrow', style: 'grid-template-columns:' + cols });
      for (const cell of cells) row.append(h('div', { class: 'lcol' }, cell.map(it => (it.g ? h('section', { class: 'stage' }, it.g.map(k => els[k])) : els[it]))));
      els.lay.append(row);
    }
  }
  function guideSeen() { try { return localStorage.getItem('miscusi.guideSeen') === '1'; } catch (e) { return false; } }
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
      else text = 'Live · shared';
    } else {
      cls = ' ro';
      text = STATE.savedAt ? 'Saved in this browser ' + fmtTime(STATE.savedAt) : 'Saved in this browser';
    }
    s.append(h('span', { class: 'dot' + cls }), h('span', null, text));
  }

  function charLabel(c, i) {
    const cls = CLASSES[c.cls].n;
    return (c.nick ? c.nick + ' — ' : '') + cls;
  }
  function renderCharOptions() {
    const sel = els.charSel;
    sel.innerHTML = '';
    sel.append(charOptions(null, null));
    sel.value = String(cur);
  }
  // Список для выбора: группа, затем противники по расам. skip — кого не показывать, sel — выбранный ключ.
  function charOptions(skip, sel) {
    const frag = document.createDocumentFragment();
    const opt = (c, key) => h('option', { value: key, selected: String(key) === String(sel) ? true : null }, `${charLabel(c, key)} · ${c.level}`);
    for (const [race, rn] of RACES) {
      const list = FOE_ORDER.filter(k => CLASSES[k].race === race).map(k => STATE.foes[k]).filter(c => c !== skip);
      if (list.length) frag.append(h('optgroup', { label: rn }, list.map(c => opt(c, 'f:' + c.cls))));
    }
    return frag;
  }
  function renderWho() {
    const c = ch();
    els.who.innerHTML = '';
    const sets = activeSets(c);
    // Пустые слоты: штаны под цельной бронёй и щит при двуручном оружии заняты, их не считаем.
    const w = c.eq.weapon && ITEMS.get(c.eq.weapon.id), chest = c.eq.chest && ITEMS.get(c.eq.chest.id);
    const covered = s => (s === 'legs' && chest && chest.s === 'full') || (s === 'shield' && w && TWO_HANDED.has(w.wt));
    const empty = Object.keys(SLOTS).filter(s => !c.eq[s] && !covered(s)).map(s => SLOTS[s].n);
    // Компактная строка вместо рендера: иконка класса, имя, сеты, заполненность слотов.
    els.who.append(
      h('img', { class: 'clsicon', src: 'icons/class_icon_' + CLASS_ICON[c.cls] + '.png', alt: CLASSES[c.cls].n }),
      h('div', { class: 'idtext' }, h('b', null, c.nick || CLASSES[c.cls].n),
        h('small', null, `${CLASSES[c.cls].n} · ${raceLabel(c)} · Lv. ${c.level}`)),
      h('div', { class: 'setchips' }, sets.map(x => h('span', { class: 'chip' }, x.set.n + (x.minE >= 3 ? ' +' + Math.min(x.minE, 6) : '')))),
      h('span', { class: 'note wornnote' }, !empty.length ? 'Full gear' : empty.length === Object.keys(SLOTS).length ? 'Nothing equipped — click a slot below' : 'Empty: ' + [...new Set(empty)].join(', ')));
  }

  function slotButton(slot, who) {
    const c = who || ch();
    const e = c.eq[slot];
    const it = e && ITEMS.get(e.id);
    const w = c.eq.weapon && ITEMS.get(c.eq.weapon.id);
    const chest = c.eq.chest && ITEMS.get(c.eq.chest.id);
    const locked = (slot === 'legs' && chest && chest.s === 'full') || (slot === 'shield' && w && TWO_HANDED.has(w.wt));
    const b = h('button', { class: 'slot' + (it ? ' filled' : ''), 'aria-label': SLOTS[slot].n + (it ? ': ' + it.n : ''), disabled: locked && !it ? true : null });
    if (it) {
      b.append(h('img', { src: icon(it.ic), alt: '' }));
      if (e.e) b.append(h('span', { class: 'en' }, '+' + e.e));
      b.append(h('span', { class: 'gr ' + it.g }, it.g === 'Epic' ? 'E' : it.g));
      if (it.sa) b.append(h('span', { class: 'sa' }));
      b.addEventListener('mouseenter', () => showTip(b, itemTip(it, e.e || 0, c)));
      b.addEventListener('mouseleave', hideTip);
    } else {
      b.append(h('span', { class: 'ph' }, locked ? '—' : SLOTS[slot].n));
      if (locked) b.style.opacity = '.4';
    }
    b.addEventListener('click', () => { hideTip(); if (!locked || it) openPicker(slot, c); });
    return b;
  }
  function itemTip(it, e, who) {
    const lines = [];
    const k = [];
    if (it.c === 'weapon') k.push(`P. Atk. ${itemStat(it, 'patk', e)} · M. Atk. ${itemStat(it, 'matk', e)}`);
    if (it.s === 'shield' && it.st && it.st.pdef != null) k.push(`Shield Def. ${itemStat(it, 'pdef', e)}` + (it.st.srate ? ` · block chance ${it.st.srate}%` : ''));
    else if (it.st && it.st.pdef != null) k.push(`P. Def. ${itemStat(it, 'pdef', e)}`);
    if (it.st && it.st.mdef != null) k.push(`M. Def. ${itemStat(it, 'mdef', e)}`);
    if (it.en && it.en.hp && enchVal(it.en.hp, e)) k.push(`HP +${enchVal(it.en.hp, e)} from enchant`);
    if (it.c === 'weapon' && shotBonus(it, e)) k.push(`Shot damage bonus +${shotBonus(it, e)}%`);
    if (it.sa) lines.push(`<div class="k">SA: ${esc(it.sa)}</div>`);
    if (it.fx) lines.push(`<div class="ln">${esc(it.fx)}</div>`);
    const set = it.set && SETS.get(it.set);
    if (set && (it.s === 'chest' || it.s === 'full')) {
      // На верхе брони показываем, что даёт сет и какие части уже надеты.
      const c = who || ch();
      const worn = new Set(Object.values(c.eq).map(x => x.id));
      const parts = set.parts.map(p => `<span class="${p.ids.some(id => worn.has(id)) ? 'p' : 'm'}">${esc(SLOTS[p.slot === 'chest' ? 'chest' : p.slot] ? SLOTS[p.slot === 'chest' ? 'chest' : p.slot].n : p.slot)}${p.shield ? ' (optional)' : ''}</span>`).join(' · ');
      lines.push(`<div class="k">Set: ${esc(set.n)}</div><div class="ln">${esc(set.fx || '')}</div>${set.shieldFx ? `<div class="ln"><b>With shield:</b> ${esc(set.shieldFx)}</div>` : ''}<div class="ln setparts">${parts}</div>`);
    } else if (set) lines.push(`<div class="k">Set: ${esc(set.n)}</div>`);
    return `<b>${esc(it.n)}${e ? ' +' + e : ''} <span class="gtag ${it.g}">${it.g}</span>${rareTag(it) ? ` <span class="ftag">${esc(rareTag(it))}</span>` : ""}</b><div class="ln">${esc(k.join('\n'))}</div>${lines.join('')}`;
  }

  function renderSlots() {
    // Все слоты одним рядом под карточкой: броня, оружие и щит, бижутерия.
    els.gear.innerHTML = '';
    ['head', 'chest', 'legs', 'gloves', 'feet', 'weapon', 'shield', 'neck', 'ear1', 'ear2', 'ring1', 'ring2'].forEach(s => els.gear.append(slotButton(s)));
  }

  const clanText = (k, l) => (k.lv && k.lv[l]) || k.text;
  function renderClan() {
    const c = ch();
    els.clan.innerHTML = '';
    if (!CLAN.length) { els.clan.hidden = true; return; }
    els.clan.hidden = false;
    const sw = h('input', { type: 'checkbox', id: 'clan-toggle', checked: c.clan ? true : null, onchange: e => { c.clan = e.target.checked; update(false); } });
    els.clan.append(
      h('div', { class: 'clanhead' }, h('h3', null, 'Clan skills'), h('label', { class: 'switch', for: 'clan-toggle' }, sw, h('span', null, c.clan ? 'On' : 'Off'))),
      h('span', { class: 'note' }, c.clan ? 'Click a skill to change its level (1–3). Hover to see what it gives.' : 'Turn on to apply clan skills to this character.'),
      h('div', { class: 'clanlist' + (c.clan ? '' : ' off') }, CLAN.map(k => {
        const l = c.clanLv[k.id];
        const tipFor = lv => `<b>${esc(k.n)} Lv. ${lv}</b><div class="ln">${esc(clanText(k, lv).replace(/^Clan members'\s*/gim, '').replace(/\n?Affects all clan members\.?/i, ''))}</div>`;
        const b = h('button', { class: 'clanitem', type: 'button', disabled: c.clan ? null : true, 'aria-label': `${k.n}, level ${l}` },
          h('img', { src: icon(k.ic), alt: '', loading: 'lazy' }), h('span', { class: 'clanlv' }, l));
        // Нажатие переключает уровень по кругу: 1 → 2 → 3 → 1.
        b.addEventListener('click', () => { c.clanLv[k.id] = l >= k.l ? 1 : l + 1; update(false); showTip(els.clan.querySelector(`[data-clan="${k.id}"]`) || b, tipFor(c.clanLv[k.id])); });
        b.dataset.clan = k.id;
        b.addEventListener('mouseenter', () => showTip(b, tipFor(c.clanLv[k.id]))); b.addEventListener('mouseleave', hideTip);
        b.addEventListener('focus', () => showTip(b, tipFor(c.clanLv[k.id]))); b.addEventListener('blur', hideTip);
        return b;
      })));
  }

  // Символ тату в игровом стиле: тёмный слот, светящаяся эмблема цвета атрибута.
  // Символ тату — иконка из клиента игры (etc_str_symbol_i00 и т. д., с вики).
  function henSymbol(hn) {
    if (!hn) return h('span', { class: 'hsym none' });
    return h('span', { class: 'hsym' }, h('img', { src: icon('etc_' + hn.up.toLowerCase() + '_symbol_i00'), alt: hn.up }));
  }
  const henText = hn => (hn ? `${hn.up} +${hn.n} · ${hn.down} −${hn.kind === 'greater' ? hn.n : hn.n + 1}` : 'Empty slot');
  // Ряд из трёх символов с подсказками и кнопкой, открывающей окно тату.
  // noBtn — без кнопки в ряду (в карточке тату она стоит отдельно под символами).
  function henRow(c, cls, noBtn) {
    return h('div', { class: 'hrow ' + (cls || '') }, c.hen.map((hn, i) => {
      // Символ — кнопка: открывает окно тату.
      const el = h('button', { class: 'hbtn', type: 'button', 'aria-label': 'Tattoo ' + (i + 1) + ': ' + henText(hn), onclick: () => { hideTip(); openTattoos(c); } }, henSymbol(hn));
      const tipHtml = `<b>Tattoo ${i + 1}</b><div class="ln">${esc(henText(hn))}</div>`;
      el.addEventListener('mouseenter', () => showTip(el, tipHtml)); el.addEventListener('mouseleave', hideTip);
      el.addEventListener('focus', () => showTip(el, tipHtml)); el.addEventListener('blur', hideTip);
      return el;
    }), noBtn ? null : henBtn(c));
  }
  const henBtn = c => h('button', { class: 'btn sm', onclick: () => { hideTip(); openTattoos(c); } }, 'Change tattoos');
  function renderTattoos() {
    const c = ch();
    els.tattoos.innerHTML = '';
    const hm = hennaMods(c);
    const sum = ATTRS.filter(a => hm[a]).map(a => h('span', { class: hm[a] > 0 ? 'p' : 'm' }, `${a} ${hm[a] > 0 ? '+' : '−'}${Math.abs(hm[a])}`));
    els.tattoos.append(h('h3', null, 'Tattoos'), henRow(c, '', true), sum.length ? h('div', { class: 'hsum' }, sum) : null, h('div', { class: 'hbtnrow' }, henBtn(c)));
  }


  let prevStats = null;
  function renderStats() {
    const c = ch();
    const r = compute(c);
    const S = r.st;
    const box = els.stats;
    box.innerHTML = '';
    const fmt = (v, d) => (d ? (Math.round(v * 10 ** d) / 10 ** d).toFixed(d) : Math.round(v).toLocaleString('en-GB'));
    const cls = (k, v) => { if (!prevStats || prevStats.cls !== c.cls + String(cur)) return ''; const p = prevStats.st[k]; if (p == null) return ''; const a = Math.round(v), b = Math.round(p); return a > b ? 'up' : a < b ? 'dn' : ''; };

    box.append(h('div', { class: 'lbl' }, 'Stats'));
    const maxBar = Math.max(S.hp, S.mp, S.cp);
    box.append(h('div', { class: 'bars' },
      [['CP', S.cp, 'var(--cp)'], ['HP', S.hp, 'var(--hp)'], ['MP', S.mp, 'var(--mp)']].map(([n, v, col]) =>
        h('div', { class: 'bar' }, h('span', null, n), h('i', { style: `width:${Math.max(4, (v / maxBar) * 100)}%;background:${col}` }), h('b', null, fmt(v))))));
    const pairs = [['patk', 'P. Atk.'], ['matk', 'M. Atk.'], ['pdef', 'P. Def.'], ['mdef', 'M. Def.'], ['acc', 'Accuracy'], ['eva', 'Evasion'], ['crit', 'Critical'], ['mcrit', 'M. Crit. %'], ['aspd', 'Atk. Spd.'], ['cspd', 'Casting Spd.'], ['speed', 'Speed'], ['sdef', 'Shield Def.'], ['srate', 'Shield rate %']];
    const g = h('div', { class: 'grid2' });
    for (const [k, n] of pairs) {
      if (S[k] == null) continue;
      g.append(h('div', { class: 'st' }, h('span', null, n), h('b', null, k === 'mcrit' ? fmt(S[k], 1) : fmt(S[k]))));
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
    renderPassives(r);
    if (r.notes.length) box.append(h('details', { class: 'note' }, h('summary', null, `Effects not counted in stats (${r.notes.length})`), h('div', { class: 'misc' }, r.notes.map(n => h('div', null, n)))));
    prevStats = { cls: c.cls + String(cur), st: S };
    renderCharOptions();
    renderWho();
  }

  // Для сверки со сторонним калькулятором в тестах.
  window.__msCompute = compute;
  window.__msDamage = (c, t) => damageRows(c, t);

  // Пассивки — иконками, описание в подсказке. Книжную пассивку нажатием отмечают изученной или нет.
  function renderPassives(r) {
    const c = ch();
    const box = els.passives;
    box.innerHTML = '';
    const on = r.pass.filter(x => !x.off).length;
    box.append(h('div', { class: 'kithead' }, h('h3', null, 'Passive skills'), h('span', { class: 'note' }, r.pass.length ? `${on} of ${r.pass.length} active` : 'None at this level')));
    const tipFor = x => `<b>${esc(x.p.n)} Lv. ${x.l}</b>${x.off ? `<div class="k bad">Not counted: ${esc(x.off)}</div>` : ''}<div class="ln">${esc(x.text)}</div>`
      + (x.p.book ? `<div class="k">Learned from ${esc(x.p.book)}. Click to mark it as ${x.unlearned ? 'learned' : 'not learned'}.</div>` : '');
    box.append(h('div', { class: 'iconlist' }, r.pass.map(x => {
      const b = h(x.p.book ? 'button' : 'span', { class: 'pic' + (x.off ? ' off' : '') + (x.p.book ? ' book' : ''), tabindex: x.p.book ? null : '0', type: x.p.book ? 'button' : null, 'aria-label': `${x.p.n}, level ${x.l}${x.off ? ', not counted' : ''}` },
        h('img', { src: icon(x.p.ic), alt: '', loading: 'lazy' }), h('span', { class: 'clanlv' }, x.l));
      if (x.p.book) b.addEventListener('click', () => {
        if (x.unlearned) delete c.noBook[x.p.id]; else c.noBook[x.p.id] = true;
        update(false);
        const nb = els.passives.querySelector(`[data-pid="${x.p.id}"]`);
        const nx = compute(c).pass.find(y => y.p.id === x.p.id);
        if (nb && nx) showTip(nb, tipFor(nx));
      });
      b.dataset.pid = x.p.id;
      b.addEventListener('mouseenter', () => showTip(b, tipFor(x))); b.addEventListener('mouseleave', hideTip);
      b.addEventListener('focus', () => showTip(b, tipFor(x))); b.addEventListener('blur', hideTip);
      return b;
    })));
  }
  // ---------------------------------------------------------------- калькулятор урона
  // Формулы — по статье вики «Урон физических умений» и расчёту Lu4 Planner:
  //   физика: (сила + P. Atk.) × соска × 70 (лук) / 77 ÷ P. Def.; крит ×2
  //   магия: √(M. Atk. × соска) × сила × 91 ÷ M. Def.; крит ×2,5
  //   обычная атака: P. Atk. × соска × 70/77 ÷ P. Def., раз в 500 / Atk. Spd. секунд.
  // var и функции: первый рендер идёт раньше этих строк.
  var dmgPrefs;
  // Шанс попадания обычной атакой от разницы Accuracy − Evasion (точки из расчёта Lu4 Planner).
  function hitChance(d) {
    const HIT_PTS = [[-30, 30], [-20, 32.6], [-15, 60.3], [-10, 73.55], [-5, 83.13], [0, 90.84], [5, 97.41], [6, 98]];
    if (d <= HIT_PTS[0][0]) return HIT_PTS[0][1];
    for (let i = 1; i < HIT_PTS.length; i++) if (d <= HIT_PTS[i][0]) { const [x0, y0] = HIT_PTS[i - 1], [x1, y1] = HIT_PTS[i]; return y0 + (y1 - y0) * (d - x0) / (x1 - x0); }
    return 98;
  }
  function pctOf(r, k) { return (r.mul[k] || 1) - 1; }
  // Бонус зарядов от заточки оружия (+0.7% за уровень у B/A): прибавляется к множителю заряда —
  // соска ×2.07 на +10, благословенный спиритшот ×4.07 (так считает Lu4 Planner).
  function shotBonus(w, e) { return w && w.en && w.en.shot ? Math.round((enchVal(w.en.shot, e || 0) || 0) * 10) / 10 : 0; }
  function shotMul(c) {
    const w = c.eq.weapon && ITEMS.get(c.eq.weapon.id);
    const sb = shotBonus(w, c.eq.weapon && c.eq.weapon.e) / 100;
    return { ss: dmgPrefs.ss ? 2 + sb : 1, ms: dmgPrefs.mshot > 1 ? dmgPrefs.mshot + sb : 1, sb };
  }
  function skillLevel(sk, lvl) { return sk.learn.reduce((m, [L, l]) => (L <= lvl && l > m ? l : m), 0); }
  function powerAt(sk, l) { let p = 0; for (const k in sk.pw) if (+k <= l && sk.pw[k]) p = sk.pw[k]; return p; }
  function damageRows(c, t) {
    const A = compute(c), D = compute(t);
    const a = A.st, d = D.st;
    const w = c.eq.weapon && ITEMS.get(c.eq.weapon.id);
    const wt = w ? w.wt : null;
    const bow = wt === 'bow';
    const K = bow ? 70 : 77;
    const shots = shotMul(c);
    const ss = shots.ss;
    const pvp = 1 + pctOf(A, 'pvpdmg') + (A.add.pvpdmg || 0) / 100;
    const pos = ({ front: 1, side: 1.2, back: 1.3 })[dmgPrefs.pos];
    const rows = [];
    // Обычная атака.
    {
      const hit = Math.min(98, hitChance(a.acc - d.eva) * pos) / 100;
      // Received P. Crit. Rate у цели (например, мастерство лёгкой брони) снижает шанс крита по ней.
      const cc = Math.min(1, a.crit / 1000 * pos * Math.max(0, 1 + pctOf(D, 'rcvcc')));
      const norm = a.patk * ss * K / d.pdef * pvp;
      const crit = (a.patk * ss * 2 * (1 + pctOf(A, 'critdmg')) + (A.add.critdmg || 0)) * K / d.pdef * pvp * (1 + pctOf(D, 'rcvcrit'));
      let avg = (1 - cc) * norm + cc * crit;
      // Щит блокирует только спереди; по лучникам шанс ×3 (как в Lu4 Planner).
      const sh = t.eq.shield && ITEMS.get(t.eq.shield.id);
      let block = 0;
      if (sh && dmgPrefs.pos === 'front') {
        block = Math.min(0.9, (sh.st.srate || 0) * bonus.DEX(D.attrs.DEX) * (bow ? 3 : 1) / 100);
        const bn = a.patk * ss * K / (d.pdef + (d.sdef || 0)) * pvp;
        avg = (1 - block) * avg + block * ((1 - cc) * bn + cc * bn * 2);
      }
      const cycle = 500 / a.aspd;
      rows.push({ n: 'Normal attack', ic: null, lv: '', norm, crit, hit, cc, block, cycle, exp: hit * avg, ok: true });
    }
    for (const sk of (DATA.attacks || {})[c.cls] || []) {
      const l = skillLevel(sk, c.level);
      if (!l) continue;
      const power = powerAt(sk, l);
      if (!power) continue;
      let why = '';
      if (sk.weapon === 'bow' && !bow) why = 'needs a bow';
      else if (sk.weapon === 'dagger' && !/dagger/.test(wt || '')) why = 'needs a dagger';
      else if (sk.weapon === 'shield' && !(c.eq.shield && ITEMS.get(c.eq.shield.id))) why = 'needs a shield';
      else if (!sk.magic && !sk.weapon && bow) why = 'not with a bow';
      // Перезарядка и время применения: баффы и пассивки вида «Skills Reuse Time −10%», «Skills Hit Time −8%».
      const reuseK = Math.max(0.1, 1 + pctOf(A, 'reuse') + pctOf(A, sk.magic ? 'mreuse' : 'preuse'));
      const hitK = Math.max(0.1, 1 + pctOf(A, 'hittime') + (sk.magic ? 0 : pctOf(A, 'phittime')));
      const cast = sk.hit * 333 / (sk.magic ? a.cspd : a.aspd) * hitK;
      const reuse = (sk.reuse || 0) * reuseK;
      const cycle = Math.max(reuse, cast);
      let norm, crit, cc;
      if (sk.magic) {
        norm = Math.sqrt(a.matk * shots.ms) * power * 91 / d.mdef * pvp * (1 + pctOf(A, 'mskill'));
        // Урон маг. крита: множитель умения × M. Crit. Damage атакующего × Received M. Crit. Damage цели.
        crit = norm * sk.cm * (A.prod.mcritdmg || 1) * Math.max(0, 1 + pctOf(D, 'rcvmcrit'));
        cc = Math.min(1, A.st.mcrit / 100);
      } else {
        const pdef = d.pdef * (1 - (sk.defIgn || 0) / 100);
        // Удар кинжалом: соска усиливает только P. Atk. (так считает Lu4 Planner).
        norm = sk.blow ? (power * (sk.pm || 1) + a.patk * ss) * K / pdef * pvp * (1 + pctOf(A, 'pskill'))
          : (power + a.patk) * ss * (sk.k || 1) * K / pdef * pvp * (1 + pctOf(A, 'pskill'));
        crit = norm * sk.cm * (1 + pctOf(A, 'pskillcrit'));
        cc = Math.min(1, sk.cc / 100 * bonus.STR(A.attrs.STR) * Math.max(0, 1 + pctOf(D, 'rcvcc')));
      }
      const avg = (1 - cc) * norm + cc * crit;
      rows.push({ n: sk.n, ic: sk.ic, lv: l, magic: sk.magic, norm, crit, hit: 1, cc, block: 0, cycle, cast, reuse, exp: avg, ok: !why, why, mp: sk.mp });
    }
    rows.forEach(r => (r.dps = r.ok ? r.exp / r.cycle : 0));
    return { rows, A, D, shots };
  }

  function renderDamage() {
    const c = ch();
    const box = els.dmg;
    if (!box) return;
    if (!dmgPrefs) dmgPrefs = { target: null, pos: 'front', ss: true, mshot: 4 };
    box.innerHTML = '';
    if (dmgPrefs.target == null || !byKey(dmgPrefs.target) || byKey(dmgPrefs.target) === c) dmgPrefs.target = 'f:' + FOE_ORDER.find(k => k !== c.cls);
    const t = byKey(dmgPrefs.target);
    const nameOf = x => (x.nick ? x.nick + ' — ' : '') + CLASSES[x.cls].n + ' · ' + x.level;
    const set = (k, v) => { dmgPrefs[k] = v; renderDamage(); };
    const who = (x, extra) => h('div', { class: 'duelist' }, h('img', { class: 'clsicon sm', src: 'icons/class_icon_' + CLASS_ICON[x.cls] + '.png', alt: '' }),
      h('div', null, h('small', null, extra), h('b', null, x.nick || CLASSES[x.cls].n), h('span', null, `${CLASSES[x.cls].n} · Lv. ${x.level}`)));
    const pick = h('select', { 'aria-label': 'Target', onchange: e => set('target', e.target.value) }, charOptions(c, dmgPrefs.target));
    const swap = h('button', { class: 'btn sm', title: 'Make the target the attacker', onclick: () => { cur = dmgPrefs.target; dmgPrefs.target = keyOf(c); try { sessionStorage.setItem('miscusi.cur', String(cur)); } catch (_) {} renderAll(); } }, '⇄ Swap');
    box.append(h('div', { class: 'secthead' }, h('h3', null, 'Damage'),
      h('span', { class: 'note' }, 'PvP damage from the selected character to any other class, with both sides’ gear, passives and buffs. Dress the target right here.')));
    box.append(h('div', { class: 'duel' }, who(c, 'Attacker'), h('span', { class: 'vs' }, '→'),
      h('div', { class: 'duelist' }, h('img', { class: 'clsicon sm', src: 'icons/class_icon_' + CLASS_ICON[t.cls] + '.png', alt: '' }), h('div', null, h('small', null, 'Target'), pick)), swap,
      h('div', { class: 'dctl' },
        h('label', { class: 'dsel' }, 'Position ', h('select', { onchange: e => set('pos', e.target.value) }, [['front', 'Front'], ['side', 'Side'], ['back', 'Back']].map(([v, n]) => h('option', { value: v, selected: v === dmgPrefs.pos ? true : null }, n)))),
        h('label', { class: 'dsel' }, h('input', { type: 'checkbox', checked: dmgPrefs.ss ? true : null, onchange: e => set('ss', e.target.checked) }), ' Soulshot'),
        h('label', { class: 'dsel' }, 'Spiritshot ', h('select', { onchange: e => set('mshot', +e.target.value) }, [[4, 'Blessed'], [2, 'Normal'], [1, 'None']].map(([v, n]) => h('option', { value: v, selected: v === dmgPrefs.mshot ? true : null }, n)))))));
    const { rows, D, shots } = damageRows(c, t);
    const f0 = x => Math.round(x).toLocaleString('en-US');
    const d = D.st;
    const fx = v => '×' + (Math.round(v * 100) / 100);
    box.append(h('div', { class: 'dtarget' }, `Target: P. Def. ${f0(d.pdef)} · M. Def. ${f0(d.mdef)} · Evasion ${f0(d.eva)} · HP ${f0(d.hp)} · CP ${f0(d.cp)}` + (t.eq.shield && ITEMS.get(t.eq.shield.id) ? ` · shield ${f0(d.sdef || 0)}` : '')
      + `  ·  Shots: soulshot ${dmgPrefs.ss ? fx(shots.ss) : 'off'}, spiritshot ${dmgPrefs.mshot > 1 ? fx(shots.ms) : 'off'}` + (shots.sb ? ` (weapon enchant +${Math.round(shots.sb * 1000) / 10}%)` : '')));
    const pool = d.hp + d.cp;
    // Цель можно переодеть прямо здесь: гир, заточка, тату, уровень, баффы, клан-скилы.
    const tHen = henRow(t, 'sm');
    const tLvl = h('input', { type: 'number', min: '1', max: '75', value: t.level, 'aria-label': 'Target level', onchange: e => { t.level = Math.max(1, Math.min(75, Math.round(+e.target.value || 75))); update(false, t); } });
    const nb = Object.keys(t.buffs).length;
    box.append(h('div', { class: 'tedit' },
      h('div', { class: 'tgear' }, ['head', 'chest', 'legs', 'gloves', 'feet', 'weapon', 'shield', 'neck', 'ear1', 'ear2', 'ring1', 'ring2'].map(sl => slotButton(sl, t))),
      h('div', { class: 'tctl' },
        h('label', { class: 'dsel' }, 'Lv. ', tLvl),
        tHen,
        h('button', { class: 'btn sm', onclick: () => openBuffs(t) }, nb ? `Buffs (${nb})` : 'Buffs'),
        h('label', { class: 'dsel' }, h('input', { type: 'checkbox', checked: t.clan ? true : null, onchange: e => { t.clan = e.target.checked; update(false, t); } }), ' Clan skills'))));
    const sorted = rows.slice().sort((x, y) => (y.ok - x.ok) || y.dps - x.dps);
    const tb = h('tbody', null, sorted.map(r => h('tr', { class: r.ok ? '' : 'off' },
      h('td', { class: 'sk' }, r.ic ? h('img', { src: icon(r.ic), alt: '', loading: 'lazy' }) : h('span', { class: 'na' }, '⚔'), h('span', null, h('b', null, r.n), r.lv ? h('small', null, ' Lv. ' + r.lv) : null, r.why ? h('small', { class: 'why' }, ' — ' + r.why) : null)),
      h('td', null, f0(r.norm)),
      h('td', null, f0(r.crit)),
      h('td', null, (r.hit < 1 ? Math.round(r.hit * 100) + '% / ' : '') + Math.round(r.cc * 100) + '%' + (r.block ? ` · block ${Math.round(r.block * 100)}%` : '')),
      h('td', null, f0(r.exp)),
      h('td', null, r.cycle.toFixed(2) + ' s'),
      h('td', { class: 'dps' }, r.ok ? f0(r.dps) : '—'),
      h('td', null, r.ok && r.dps ? (pool / r.dps).toFixed(1) + ' s' : '—'))));
    box.append(h('div', { class: 'dwrap' }, h('table', { class: 'dtable' },
      h('thead', null, h('tr', null, ['Skill', 'Hit', 'Crit', 'Hit · crit %', 'Average', 'Cycle', 'DPS', 'CP+HP in'].map(x => h('th', null, x)))), tb)));
    box.append(h('p', { class: 'note' }, 'Average includes crit chance and, for normal attacks, miss and shield block. Cycle is the longer of reuse and cast time (cast time scales with Atk. Spd. / Casting Spd.). «CP+HP in» — time to burn the target’s CP and HP using only that line. PvP, no attributes.'));
  }

  function renderBuffs() {
    const c = ch();
    const box = els.buffs;
    box.innerHTML = '';
    buildBuffs(c, box);
  }
  function buildBuffs(c, box) {
    const groups = availableBuffs(c);
    const activeCount = Object.keys(c.buffs).length;
    box.append(h('div', { class: 'secthead' },
      h('h3', null, 'Buffs'),
      h('span', { class: 'note' }, 'Own class skills plus buffs any class can give (archers excluded). Buff level follows the level of that class’s character.'),
      h('button', { class: 'btn sm', disabled: !activeCount, onclick: () => { c.buffs = {}; update(false, c); } }, 'Remove all')));
    const wrap = h('div', { class: 'buffgroups' });
    const overGrid = buffOverrides(c);
    for (const grp of groups) {
      const list = h('div', { class: 'bufflist' });
      for (const b of grp.list) {
        const on = c.buffs[b.id] != null;
        const lv = on ? c.buffs[b.id] : casterLevel(b, grp.key === 'self' ? c.cls : grp.key, c);
        const btn = h('button', { class: 'buff' + (on ? ' on' : '') + (overGrid[b.id] ? ' over' : ''), 'aria-pressed': on ? 'true' : 'false', 'aria-label': b.n },
          h('img', { src: icon(b.ic), alt: '' }), h('span', { class: 'lv' }, lv),
          b.tgt === 'party' ? h('span', { class: 'tg' }, 'PT') : b.kind === 'toggle' ? h('span', { class: 'tg' }, 'TG') : null);
        btn.addEventListener('click', () => toggleBuff(b, lv, c));
        btn.addEventListener('mouseenter', () => showTip(btn, `<b>${esc(b.n)} · Lv. ${lv}</b><div class="ln">${esc(b.lv[lv - 1])}</div><div class="k">${b.tgt === 'party' ? 'Party' : b.tgt === 'target' ? 'Target' : 'Self'}${b.kind === 'toggle' ? ' · toggle' : ''}</div>${overGrid[b.id] ? `<div class="k">Does not stack with ${esc(overGrid[b.id].n)}: no effect</div>` : ''}`));
        btn.addEventListener('mouseleave', hideTip);
        list.append(btn);
      }
      wrap.append(h('div', { class: 'bg' }, h('h4', null, grp.title, h('small', null, grp.sub)), list));
    }
    if (!groups.length) wrap.append(h('div', { class: 'empty' }, 'No buffs available.'));
    box.append(wrap);

    if (activeCount) {
      const act = h('div', { class: 'active' });
      const over = buffOverrides(c);
      for (const id of Object.keys(c.buffs)) {
        const b = BUFFS.get(id);
        const sel = h('select', { 'aria-label': 'Level ' + b.n, onchange: e => { c.buffs[id] = +e.target.value; update(false, c); } },
          b.lv.map((_, i) => h('option', { value: i + 1, selected: c.buffs[id] === i + 1 ? true : null }, 'Lv. ' + (i + 1))));
        act.append(h('span', { class: 'chip' + (over[id] ? ' off' : ''), title: over[id] ? 'Does not stack with ' + over[id].n + ': no effect' : null }, h('img', { src: icon(b.ic), alt: '' }), b.n, sel, h('button', { 'aria-label': 'Remove ' + b.n, onclick: () => { delete c.buffs[id]; update(false, c); } }, '×')));
      }
      box.append(h('div', { class: 'lbl', style: 'margin-top:12px' }, `Active: ${activeCount}`), act);
    }
  }

  // Баффы одной группы (abnormalType) не складываются: действует тот, у кого выше уровень эффекта.
  // Возвращает { id перекрытого баффа: баффа, который его перекрывает }.
  function buffOverrides(c) {
    const best = {}, over = {};
    for (const id in c.buffs) {
      const b = BUFFS.get(id);
      if (!b || !b.ab) continue;
      const i = Math.min(c.buffs[id], b.lv.length) - 1, t = b.ab[i];
      if (!t) continue;
      if (!best[t]) { best[t] = id; continue; }
      const o = BUFFS.get(best[t]), oi = Math.min(c.buffs[best[t]], o.lv.length) - 1;
      if ((b.al[i] || 0) > (o.al[oi] || 0)) { over[best[t]] = b; best[t] = id; } else over[id] = o;
    }
    for (const id in over) { let w = over[id]; while (over[w.id]) w = over[w.id]; over[id] = w; }
    return over;
  }
  // Одинаковые баффы не складываются: «Mass X» заменяет «X» и наоборот.
  const stackKey = b => b.stack || b.n.replace(/^Mass\s+/i, '').trim().toLowerCase();
  function toggleBuff(b, lv, who) {
    const c = who || ch();
    if (c.buffs[b.id] != null) delete c.buffs[b.id];
    else {
      for (const id of Object.keys(c.buffs)) { const o = BUFFS.get(id); if (o && stackKey(o) === stackKey(b)) delete c.buffs[id]; }
      c.buffs[b.id] = lv || b.lv.length;
    }
    update(false, c);
  }
  // Баффы цели — в боковом окне, таблица урона пересчитывается сразу.
  var buffDlgFor = null;
  function drawBuffDialog() {
    const dlg = els.dialog, c = buffDlgFor;
    const sc = dlg.querySelector('.dlgbody') ? dlg.querySelector('.dlgbody').scrollTop : 0;
    dlg.innerHTML = '';
    const body = h('div', { class: 'dlgbody' });
    buildBuffs(c, body);
    dlg.append(h('div', { class: 'dlg' }, h('div', { class: 'dlghead' }, h('h2', null, 'Buffs', h('small', { class: 'dlgwho' }, ' · ' + (c.nick || CLASSES[c.cls].n))), h('button', { class: 'btn sm', onclick: () => dlg.close() }, 'Close')), body));
    body.scrollTop = sc;
  }
  function openBuffs(c) {
    const dlg = els.dialog;
    if (dlg.open) dlg.close();
    buffDlgFor = c; dlg.dataset.kind = 'buffs';
    drawBuffDialog();
    if (matchMedia('(min-width:1100px)').matches) { dlg.show(); document.body.classList.add('picking'); } else dlg.showModal();
  }

  function renderForm() {
    const c = ch();
    els.nick.value = c.nick || '';
    els.lvlR.value = c.level; els.lvlN.value = c.level;
  }
  function renderModel() { renderWho(); }

  function renderAll() {
    prevStats = null;
    renderForm(); renderSlots(); renderTattoos(); renderClan(); renderStats(); renderBuffs(); renderDamage(); renderModel(); renderSave();
  }
  // who — персонаж, которого правили (по умолчанию текущий); цель урона правится прямо из блока урона.
  function update(model, who) {
    renderSlots(); renderTattoos(); renderClan(); renderStats(); renderBuffs(); renderDamage();
    if (model !== false) renderModel();
    if (els.dialog.open && els.dialog.dataset.kind === 'buffs' && buffDlgFor) drawBuffDialog();
    markDirty(who);
  }

  // ---------------------------------------------------------------- выбор предмета
  const pickerPrefs = { grade: 'all', q: '' };
  // Редкие шлемы, перчатки и ботинки бывают в трёх вариантах (Heavy/Light/Robe) — показываем тип рядом с «Rare».
  const rareTag = it => [it.fnd ? 'Rare' : '', it.at && ['head', 'gloves', 'feet'].includes(it.s) ? (TYPE_RU[it.at] || it.at) : ''].filter(Boolean).join(' · ');
  const AT_ORDER = { heavy: 1, light: 2, robe: 3 };
  function openPicker(slot, who) {
    const c = who || ch();
    const dlg = els.dialog;
    const kinds = SLOTS[slot].kinds;
    const pool = DATA.items.filter(it => kinds.includes(it.s) && (!it.base || it.base === it.id || !ITEMS.has(it.base)));

    function draw() {
      dlg.innerHTML = '';
      const e = c.eq[slot];
      const curIt = e && ITEMS.get(e.id);
      const head = h('div', { class: 'dlghead' }, h('h2', null, SLOTS[slot].n, c !== ch() ? h('small', { class: 'dlgwho' }, ' · ' + (c.nick || CLASSES[c.cls].n)) : null), h('button', { class: 'btn sm', onclick: () => dlg.close() }, 'Close'));
      const box = h('div', { class: 'dlg' }, head);

      if (curIt) {
        const variants = VARIANTS.get(curIt.base || curIt.id) || [curIt];
        const curRow = h('div', { class: 'cur' },
          h('img', { src: icon(curIt.ic), alt: '' }),
          h('div', { class: 'nm' }, curIt.n, h('span', { class: 'gtag ' + curIt.g }, curIt.g), rareTag(curIt) ? h('span', { class: 'ftag' }, rareTag(curIt)) : null),
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
      // Фильтр типа — свой для каждого слота, чтобы выбор в броне не прятал шлемы.
      const typeKey = 'type_' + slot.replace(/\d$/, '');
      if (!pickerPrefs[typeKey]) pickerPrefs[typeKey] = 'all';
      const seg = (key, opts) => h('div', { class: 'seg', role: 'group' }, opts.map(([v, n]) => h('button', { class: pickerPrefs[key] === v ? 'on' : '', 'aria-pressed': pickerPrefs[key] === v ? 'true' : 'false', onclick: () => { pickerPrefs[key] = v; draw(); } }, n)));
      const tools = h('div', { class: 'dlgtools' }, q, seg('grade', [['all', 'All'], ['B', 'B'], ['A', 'A']].concat(pool.some(it => it.g === 'Epic') ? [['Epic', 'Epic']] : [])));
      const types = [...new Set(pool.map(it => it.at || it.wtn).filter(Boolean))];
      if (types.length > 1) tools.append(seg(typeKey, [['all', 'Any type']].concat(types.map(t => [t, TYPE_RU[t] || t]))));
      box.append(tools);
      const list = h('div', { class: 'list', role: 'listbox', 'aria-label': 'Items' });
      box.append(list);
      dlg.append(box);

      function drawList() {
        list.innerHTML = '';
        const needle = pickerPrefs.q.trim().toLowerCase();
        const rows = pool.filter(it => (pickerPrefs.grade === 'all' || it.g === pickerPrefs.grade)
          // Вещи без типа (обычные шлемы, перчатки, ботинки) подходят к любой броне.
          && (pickerPrefs[typeKey] === 'all' || !(it.at || it.wtn) || (it.at || it.wtn) === pickerPrefs[typeKey] || !types.includes(pickerPrefs[typeKey]))
          && (!needle || it.n.toLowerCase().includes(needle)))
          .sort((a, b) => (a.g === b.g ? 0 : a.g === 'A' ? -1 : 1) || mainVal(b) - mainVal(a) || a.n.localeCompare(b.n) || !!a.fnd - !!b.fnd || (AT_ORDER[a.at] || 0) - (AT_ORDER[b.at] || 0));
        if (!rows.length) { list.append(h('div', { class: 'empty' }, 'Nothing found. Clear a filter or change the search.')); return; }
        for (const it of rows) {
          const selected = curIt && (curIt.base || curIt.id) === (it.base || it.id);
          const row = h('button', { class: 'row' + (selected ? ' sel' : ''), role: 'option', 'aria-selected': selected ? 'true' : 'false' },
            h('img', { src: icon(it.ic), alt: '', loading: 'lazy' }),
            h('span', { class: 't' }, h('b', null, it.n, h('span', { class: 'gtag ' + it.g }, it.g), rareTag(it) ? h('span', { class: 'ftag' }, rareTag(it)) : null, it.pvp ? h('span', { class: 'ftag' }, 'PvP') : null)),
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
    function changed() { update(true, c); if (dlg.open) { const st = dlg.querySelector('.list'); const sc = st ? st.scrollTop : 0; draw(); const nl = dlg.querySelector('.list'); if (nl) nl.scrollTop = sc; } }
    dlg.dataset.kind = 'item';
    draw();
    // На широком экране окно выбора не блокирует страницу: можно сразу нажать другой слот.
    if (!dlg.open) { if (matchMedia('(min-width:1100px)').matches) { dlg.show(); document.body.classList.add('picking'); } else dlg.showModal(); }
  }
  const TYPE_RU = { heavy: 'Heavy', light: 'Light', robe: 'Robe', sword: 'Sword', bigsword: 'Two-handed sword', blunt: 'Blunt', bigblunt: 'Two-handed blunt', staff: 'Staff', bigstaff: 'Staff', dagger: 'Dagger', bow: 'Bow', pole: 'Polearm', fist: 'Fists', dualfist: 'Fists', dual: 'Dual swords', dualdagger: 'Dual daggers', dualblunt: 'Dual blunt', rapier: 'Rapier', ancientsword: 'Ancient sword' };
  function mainVal(it) { return it.c === 'weapon' ? (it.st.patk || 0) + (it.st.matk || 0) : (it.st.pdef || 0) + (it.st.mdef || 0); }
  function mainText(it) {
    if (it.c === 'weapon') return `${it.st.patk || 0} / ${it.st.matk || 0}`;
    if (it.st.mdef != null && it.s !== 'shield' && ['neck', 'ear', 'ring'].includes(it.s)) return `M.Def ${it.st.mdef}`;
    if (it.s === 'shield' && it.st.pdef != null) return `S.Def ${it.st.pdef}` + (it.st.srate ? ` · ${it.st.srate}%` : '');
    if (it.st.pdef != null) return `P.Def ${it.st.pdef}`;
    return '';
  }

  // ---------------------------------------------------------------- татуировки
  function openTattoos(who) {
    const c = who || ch();
    const dlg = els.dialog;
    if (dlg.open) dlg.close();
    dlg.dataset.kind = 'tattoo';
    const pairs = { STR: ['CON', 'DEX'], CON: ['STR', 'DEX'], DEX: ['STR', 'CON'], INT: ['MEN', 'WIT'], MEN: ['INT', 'WIT'], WIT: ['INT', 'MEN'] };
    const draft = c.hen.map(x => (x ? Object.assign({}, x) : null));
    // Плюс к одному атрибуту от всех тату — не больше +5.
    const room = (a, i) => 5 - draft.reduce((s2, x, j) => s2 + (x && j !== i && x.up === a ? x.n : 0), 0);
    function draw() {
      dlg.innerHTML = '';
      const rows = draft.map((d, i) => {
        if (!d) return h('div', { class: 'hedit' }, henSymbol(null), h('span', { class: 'note' }, `Slot ${i + 1} is empty`),
          h('button', { class: 'btn sm', onclick: () => { const up = ATTRS.find(a => room(a, i) > 0) || 'STR'; draft[i] = { up, down: pairs[up][0], n: Math.max(1, Math.min(4, room(up, i))), kind: 'greater' }; draw(); } }, 'Add'));
        d.n = Math.max(1, Math.min(d.n, 4, Math.max(1, room(d.up, i))));
        const up = h('select', { 'aria-label': 'Raises', onchange: e => { d.up = e.target.value; if (!pairs[d.up].includes(d.down)) d.down = pairs[d.up][0]; draw(); } }, ATTRS.map(a => h('option', { value: a, selected: a === d.up ? true : null, disabled: room(a, i) > 0 || a === d.up ? null : true }, a)));
        const n = h('select', { 'aria-label': 'By', onchange: e => { d.n = +e.target.value; draw(); } }, [1, 2, 3, 4].filter(v => v <= Math.max(1, Math.min(4, room(d.up, i)))).map(v => h('option', { value: v, selected: v === d.n ? true : null }, '+' + v)));
        const down = h('select', { 'aria-label': 'Lowers', onchange: e => { d.down = e.target.value; draw(); } }, pairs[d.up].map(a => h('option', { value: a, selected: a === d.down ? true : null }, a)));
        const kind = h('select', { 'aria-label': 'Dye', onchange: e => { d.kind = e.target.value; draw(); } },
          h('option', { value: 'greater', selected: d.kind === 'greater' ? true : null }, 'Greater (1:1)'),
          h('option', { value: 'normal', selected: d.kind === 'normal' ? true : null }, 'Regular (−n−1)'));
        return h('div', { class: 'hedit' }, henSymbol(d), up, n, h('span', { class: 'note' }, 'lowers'), down, kind,
          h('span', { class: 'hres' }, henText(d)),
          h('button', { class: 'btn sm', 'aria-label': 'Clear slot ' + (i + 1), onclick: () => { draft[i] = null; draw(); } }, '×'));
      });
      dlg.append(h('div', { class: 'dlg' },
        h('div', { class: 'dlghead' }, h('h2', null, 'Tattoos', c !== ch() ? h('small', { class: 'dlgwho' }, ' · ' + (c.nick || CLASSES[c.cls].n)) : null), h('button', { class: 'btn sm', onclick: () => dlg.close() }, 'Close')),
        h('div', { class: 'hedits' }, rows),
        h('p', { class: 'note', style: 'padding:0 16px' }, 'Up to three tattoos; all of them together can raise one attribute by +5 at most.'),
        h('div', { class: 'dlgfoot' }, h('button', { class: 'btn primary', onclick: () => { c.hen = draft.map(x => (x ? Object.assign({}, x) : null)); dlg.close(); update(false, c); } }, 'Apply'))));
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
