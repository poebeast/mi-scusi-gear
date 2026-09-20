// Сверка наших статов с расчётом Lu4 Planner (data/raw/ref.json): node tools/check-ref.js [фильтр] [строк]
// Не сверяем (SKIP): с 19.09 Lu4 Planner прибавляет базу персонажа к оружию и умножает плоские P. Atk./M. Atk.
// пассивок на STR/INT и уровень, а без оружия даёт «кулак» (Atk. Spd. 379, крит 8). С окном персонажа в игре
// это не сходится (Swordsinger 75: P. Atk. 405 и M. Atk. 172 в игре = наш расчёт, у планера 460 и 182),
// поэтому P. Atk./M. Atk. не сверяем нигде, а Atk. Spd. и крит — у персонажей без оружия.
const fs = require('fs');
const { execFileSync } = require('child_process');
const SP = require('path').join(require('os').tmpdir(), 'ms-check');
const SITE = require('path').join(__dirname, '..', 'docs').replace(/\\/g, '/');
const ref = JSON.parse(fs.readFileSync(require('path').join(__dirname, '..', 'data', 'raw', 'ref.json'), 'utf8'));
// ref2.json — голые персонажи остальных классов по уровням (собирается в convert.js из данных планнера).
const ref2p = require('path').join(__dirname, '..', 'data', 'raw', 'ref2.json');
if (fs.existsSync(ref2p)) ref.cases.push(...JSON.parse(fs.readFileSync(ref2p, 'utf8')).cases);
fs.mkdirSync(SP, { recursive: true });
const filter = process.argv[2] || '';
const NAT = { paladin: ['human', 'fighter'], bishop: ['human', 'mystic'], elder: ['elf', 'mystic'], swordsinger: ['elf', 'fighter'], overlord: ['orc', 'mystic'], hawkeye: ['human', 'fighter'], silverranger: ['elf', 'fighter'], phantomranger: ['darkelf', 'fighter'],
  gladiator: ['human', 'fighter'], warlord: ['human', 'fighter'], darkavenger: ['human', 'fighter'], treasurehunter: ['human', 'fighter'], sorcerer: ['human', 'mystic'], necromancer: ['human', 'mystic'], warlock: ['human', 'mystic'], prophet: ['human', 'mystic'],
  templeknight: ['elf', 'fighter'], plainwalker: ['elf', 'fighter'], spellsinger: ['elf', 'mystic'], elementalsummoner: ['elf', 'mystic'], shillienknight: ['darkelf', 'fighter'], bladedancer: ['darkelf', 'fighter'], abysswalker: ['darkelf', 'fighter'],
  spellhowler: ['darkelf', 'mystic'], phantomsummoner: ['darkelf', 'mystic'], shillienelder: ['darkelf', 'mystic'], destroyer: ['orc', 'fighter'], tyrant: ['orc', 'fighter'], warcryer: ['orc', 'mystic'], bountyhunter: ['dwarf', 'fighter'], warsmith: ['dwarf', 'fighter'], terramancer: ['dwarf', 'fighter'] };
// Книги: в эталонах планера три книжных Will всегда изучены, поэтому noBook у случаев пустой.
const cases = ref.cases.filter(c => !filter || c.id.includes(filter));
for (const c of cases) Object.assign(c.char, { race: NAT[c.char.cls][0], type: NAT[c.char.cls][1], gender: 'male', hen: c.char.hen || [null, null, null], buffs: c.char.buffs || {}, clan: false, clanLv: {} });

fs.writeFileSync(SITE + '/_test.js', `
window.__CASES = ${JSON.stringify(cases.map(c => c.char))};
addEventListener('load', () => setTimeout(() => {
  const out = window.__CASES.map(ch => { try { const r = window.__msCompute(ch); return { st: r.st, attrs: r.attrs }; } catch (e) { return { err: String(e) }; } });
  const p = document.createElement('pre'); p.id = 'dump'; p.textContent = JSON.stringify(out); document.body.appendChild(p);
}, 300));`);
const html = fs.readFileSync(SITE + '/index.html', 'utf8')
  .replace(/<script src="config.js[^"]*"><\/script>/, '<script>window.MISCUSI_CONFIG={}</script>')
  .replace(/(<script src="app.js[^"]*"><\/script>)/, '$1<script src="_test.js"></script>');
fs.writeFileSync(SITE + '/_test.html', html);
fs.rmSync(SP + '/chrome-prof', { recursive: true, force: true });
const dom = execFileSync('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--user-data-dir=' + SP + '/chrome-prof', '--virtual-time-budget=15000', '--allow-file-access-from-files', '--dump-dom', 'file:///' + SITE + '/_test.html'], { maxBuffer: 1 << 28 }).toString();
fs.rmSync(SITE + '/_test.html'); fs.rmSync(SITE + '/_test.js');
const m = dom.match(/<pre id="dump">([\s\S]*?)<\/pre>/);
if (!m) { console.log('нет дампа'); process.exit(1); }
const ours = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));

const KEYS = [['hp', 'hp'], ['mp', 'mp'], ['cp', 'cp'], ['patk', 'patk'], ['matk', 'matk'], ['pdef', 'pdef'], ['mdef', 'mdef'], ['acc', 'accuracy'], ['eva', 'evasion'], ['crit', 'critical', 10], ['aspd', 'attackSpeed'], ['cspd', 'magicSpeed'], ['speed', 'moveSpeed'], ['sdef', 'shieldDefence'], ['srate', 'shieldRate']];
const worst = {};
const rows = [];
cases.forEach((c, i) => {
  const o = ours[i];
  if (!o || o.err) { rows.push(c.id + ' ERR ' + (o && o.err)); return; }
  const diffs = [];
  const SKIP = /-naked-/.test(c.id) || !c.char.eq.weapon ? ['patk', 'matk', 'aspd', 'crit'] : ['patk', 'matk'];
  for (const [k, rk, mult] of KEYS) {
    if (SKIP.includes(k)) continue;
    const rv = c.ref[rk] * (mult || 1), ov = o.st[k];
    if (rv == null || ov == null) continue;
    const d = rv ? (ov - rv) / rv * 100 : 0;
    if (!worst[k] || Math.abs(d) > Math.abs(worst[k].d)) worst[k] = { d, id: c.id, ov, rv };
    if (Math.abs(d) > 0.5) diffs.push(`${k} ${ov.toFixed(1)}/${rv.toFixed(1)} (${d > 0 ? '+' : ''}${d.toFixed(1)}%)`);
  }
  if (diffs.length) rows.push(c.id + ': ' + diffs.join(', '));
});
console.log('случаев', cases.length, 'с расхождением >0.5%:', rows.length);
console.log(rows.slice(0, Number(process.argv[3] || 40)).join('\n'));
console.log('--- худшие по статам');
for (const k in worst) console.log(k.padEnd(6), worst[k].d.toFixed(2) + '%', worst[k].id, worst[k].ov.toFixed(2), '/', worst[k].rv.toFixed(2));
