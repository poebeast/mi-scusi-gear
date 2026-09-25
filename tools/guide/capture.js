// node tools/guide/capture.js — снимает экраны и координаты для гайда (раскладка «один экран», ширина 1600).
// Кладёт в tools/guide/ пары «картинка + координаты»: full, picker, tattoo, tbuffs, addbuffs, ptip.
// Дальше: python annotate.py (из tools/guide) → img/*.jpg, потом node build_guide.js → guide.html.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const HERE = __dirname.split(path.sep).join('/');
const ROOT = path.resolve(__dirname, '../..').split(path.sep).join('/');
const SITE = ROOT + '/docs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const CLS = 'silverranger';
const W = 1600;

// В странице: координаты элементов относительно документа. Ключ → селектор или функция.
function dumpRects(spec) {
  const R = e => { if (typeof e === 'string') e = document.querySelector(e); if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round(r.left + scrollX), Math.round(r.top + scrollY), Math.round(r.width), Math.round(r.height)]; };
  const out = { H: document.documentElement.scrollHeight };
  for (const k in spec) { try { out[k] = R(typeof spec[k] === 'function' ? spec[k]() : spec[k]); } catch (e) { out[k] = null; } }
  const p = document.createElement('pre'); p.id = 'out'; p.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden';
  p.textContent = JSON.stringify(out); document.body.appendChild(p);
}

function run({ name, h, act, spec, shot, wait = 1500 }) {
  const specSrc = '{' + Object.entries(spec).map(([k, v]) => JSON.stringify(k) + ':' + (typeof v === 'function' ? v.toString() : JSON.stringify(v))).join(',') + '}';
  const setup = `addEventListener('load', () => setTimeout(() => {
  try { ${act || ''} } catch (e) {}
  setTimeout(() => { (${dumpRects.toString()})(${specSrc}); }, 700);
}, ${wait}));`;
  fs.writeFileSync(SITE + '/_g.js', setup);
  const pre = `<script>try{sessionStorage.setItem('miscusi.cur','f:${CLS}');localStorage.setItem('miscusi.guideSeen','1')}catch(e){}</script>`;
  const html = fs.readFileSync(SITE + '/index.html', 'utf8')
    .replace(/<script src="config.js[^"]*"><\/script>/, '<script>window.MISCUSI_CONFIG={}</script>' + pre)
    .replace(/(<script src="app.js[^"]*"><\/script>)/, '$1<script src="_g.js"></script>');
  fs.writeFileSync(SITE + '/_g.html', html);
  fs.rmSync(HERE + '/.chrome-' + name, { recursive: true, force: true });
  const args = ['--headless=new', '--user-data-dir=' + HERE + '/.chrome-' + name, '--window-size=' + W + ',' + h,
    '--hide-scrollbars', '--virtual-time-budget=16000', '--allow-file-access-from-files', '--dump-dom'];
  if (shot) args.push('--screenshot=' + HERE + '/' + shot);
  args.push('file:///' + SITE + '/_g.html');
  const dom = execFileSync(CHROME, args, { maxBuffer: 1 << 28 }).toString();
  fs.rmSync(SITE + '/_g.html'); fs.rmSync(SITE + '/_g.js');
  fs.rmSync(HERE + '/.chrome-' + name, { recursive: true, force: true });
  const m = dom.match(/<pre id="out"[^>]*>([\s\S]*?)<\/pre>/);
  if (!m) throw new Error(name + ': нет дампа координат');
  return JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'"));
}

// Функция уходит в страницу текстом, поэтому заголовок вшиваем в её тело, а не в замыкание.
const th = t => new Function('return [...document.querySelectorAll(".dtable th")].find(x => x.textContent === ' + JSON.stringify(t) + ')');
const FULL = {
  top: '.top', guide: '.guidebtn', save: '.save .dot', charSel: '#char-select', nick: '#char-nick', lvl: '.charbar .lvl', charbar: '.charbar',
  gear: '.stage', slotW: () => document.querySelectorAll('.gearrow .slot')[5], slotLocked: () => [...document.querySelectorAll('.gearrow .slot')].find(s => !s.querySelector('img')),
  stats: '.stats', sub: '.stathead .switch', subInfo: '.stathead .info', bars: '.stats .bars', grid: '.stats .grid2', attrs: '.stats .attrs', misc: '.stats .misc', notes: '.stats details',
  tat: '.tattoos', hrow: '.tattoos .hrow', hsum: '.tattoos .htxt',
  pas: '.passives', pasInfo: '.passives .info', pic: '.passives .pic', picBook: '.passives .pic.book', picOff: '.passives .pic.off',
  clan: '.clan', clanSw: '.clanhead .switch', clanItem: '.clanlist .clanitem',
  dmg: '.sect.dmg', dmgInfo: '.sect.dmg .secthead .info', att: '.duel>.duelist:first-child', tsel: '.duelist select', swap: '.duel .swap', dctl: '.dctl',
  tline: '.dtarget.kvs', tedit: '.tedit', tgear: '.tgear', tctl: '.tctl', table: '.dwrap',
  thHit: th('Hit'), thAvg: th('Average'), thCyc: th('Cycle'), thDps: th('DPS'), thKill: th('CP+HP in'), rowOff: '.dtable tr.off',
  buffs: '.buffsect', add: '.addbuffs', removeAll: '.buffsect .secthead .btn:last-child', chip: '.buffsect .active .chip', chipSel: '.buffsect .active .chip select', chipX: '.buffsect .active .chip button',
  roster: '.roster', me: '.rost.me', tg: '.rost.tg',
  matchups: () => document.querySelectorAll('.sect.ins')[0], mskill: '.mskill', mhead: '.mhead', mrow: '.mrow:not(.mhead)',
  upgrades: () => document.querySelectorAll('.sect.ins')[1], urow: '.urow:not(.mhead)', apply: '.urow:not(.mhead) .btn',
  impact: () => document.querySelectorAll('.sect.ins')[2], irow: '.irow:not(.mhead)', izero: '.irow.zero',
};

// 1. высота страницы, потом полный снимок на эту высоту (без прокрутки — координаты окон совпадут со снимком)
let r = run({ name: 'probe', h: 1000, spec: { x: 'body' } });
const H = r.H + 20;
console.log('высота страницы', H);
const full = run({ name: 'full', h: H, spec: FULL, shot: 'full.png', wait: 2500 });
fs.writeFileSync(HERE + '/rects.json', JSON.stringify(full));

const DLG = { dlg: 'dialog#picker .dlg' };
// 2. окно оружия с камнем жизни
fs.writeFileSync(HERE + '/r_picker.json', JSON.stringify(run({
  name: 'picker', h: H, shot: 'picker.png',
  act: `document.querySelectorAll('.gearrow .slot')[5].click(); setTimeout(() => { const s = document.querySelector('[aria-label="Life Stone skill"]'); s.value = 'focus'; s.dispatchEvent(new Event('change')); }, 200);`,
  spec: Object.assign({ step: '.cur .step', sa: '#sa-select', rarity: '[aria-label=Rarity]', ls: '[aria-label="Life Stone skill"]', lsm: '[aria-label="Life Stone skill type"]', unequip: () => [...document.querySelectorAll('.cur .btn')].pop(), lsfx: () => [...document.querySelectorAll('dialog .fx')].pop(), search: '#picker-search', seg: '.dlgtools .seg', row: '.list .row' }, DLG),
})));
// 3. окно тату
fs.writeFileSync(HERE + '/r_tattoo.json', JSON.stringify(run({
  name: 'tattoo', h: H, shot: 'tattoo.png', act: `document.querySelector('.tattoos .hbtn').click();`,
  spec: Object.assign({ hedit: '.hedit', hclear: '.hedit .btn', apply: '.dlgfoot .btn' }, DLG),
})));
// 4. баффы цели
fs.writeFileSync(HERE + '/r_tbuffs.json', JSON.stringify(run({
  name: 'tbuffs', h: H, shot: 'tbuffs.png', act: `[...document.querySelectorAll('.tctl .btn')].find(b => /^Buffs/.test(b.textContent)).click();`, spec: DLG,
})));
// 5. «+ Add» — полная сетка бафов
fs.writeFileSync(HERE + '/r_addbuffs.json', JSON.stringify(run({
  name: 'addbuffs', h: H, shot: 'addbuffs.png', act: `document.querySelector('.addbuffs').click();`,
  spec: Object.assign({ bg: 'dialog .buffgroups .bg', buff: 'dialog .buffgroups .buff', buffOn: 'dialog .buffgroups .buff.on', pt: 'dialog .buffgroups .buff .tg' }, DLG),
})));
// 6. подсказка пассивки
fs.writeFileSync(HERE + '/r_ptip.json', JSON.stringify(run({
  name: 'ptip', h: H, shot: 'ptip.png', act: `document.querySelector('.passives .pic.book').dispatchEvent(new MouseEvent('mouseenter'));`, spec: { tip: '.tip', pas: '.passives' },
})));
console.log('готово');
