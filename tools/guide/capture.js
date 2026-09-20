// node tools/guide/capture.js — снимает экраны и координаты для гайда.
// Кладёт в tools/guide/: full.png + rects.json, rects_1100.json, picker.png + r_picker.json,
// tattoo.png + r_tattoo.json, ptip.png + r_ptip.json, tbuffs.png + r_tbuffs.json.
// Дальше: python annotate.py → img/*.jpg, потом node build_guide.js → guide.html.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const HERE = __dirname.replace(/\\/g, '/');
const ROOT = path.resolve(__dirname, '../..').replace(/\\/g, '/');
const SITE = ROOT + '/docs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const CLS = 'silverranger';
const rects = fs.readFileSync(HERE + '/rects.js', 'utf8');
const rects2 = fs.readFileSync(HERE + '/rects2.js', 'utf8');

// Дамп координат не должен влиять на вёрстку и попадать в кадр — уводим его за экран.
const HIDE = `const o = document.getElementById('out'); if (o) { o.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden'; }`;

function run({ name, w, h, act, dump, shot, wait = 1200 }) {
  const setup = `
addEventListener('load', () => setTimeout(() => {
  try { ${act || ''} } catch (e) {}
  setTimeout(() => { ${dump}\n${HIDE} }, 400);
}, ${wait}));`;
  fs.writeFileSync(SITE + '/_g.js', setup);
  const pre = `<script>try{sessionStorage.setItem('miscusi.cur','f:${CLS}')}catch(e){}</script>`;
  const html = fs.readFileSync(SITE + '/index.html', 'utf8')
    .replace(/<script src="config.js[^"]*"><\/script>/, '<script>window.MISCUSI_CONFIG={}</script>' + pre)
    .replace(/(<script src="app.js[^"]*"><\/script>)/, '$1<script src="_g.js"></script>');
  fs.writeFileSync(SITE + '/_g.html', html);
  const args = ['--headless=new', '--user-data-dir=' + HERE + '/.chrome-' + name, '--window-size=' + w + ',' + h,
    '--hide-scrollbars', '--virtual-time-budget=16000', '--allow-file-access-from-files', '--dump-dom'];
  if (shot) args.push('--screenshot=' + HERE + '/' + shot);
  args.push('file:///' + SITE + '/_g.html');
  const dom = execFileSync(CHROME, args, { maxBuffer: 1 << 28 }).toString();
  fs.rmSync(SITE + '/_g.html'); fs.rmSync(SITE + '/_g.js');
  const m = dom.match(/<pre id="out"[^>]*>([\s\S]*?)<\/pre>/);
  if (!m) throw new Error(name + ': нет дампа координат');
  const txt = m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'");
  return JSON.parse(txt);
}

const W = 1456;
// 1. высота всей страницы, потом полный снимок на эту высоту
let r = run({ name: 'probe', w: W, h: 1000, dump: rects });
console.log('высота страницы', r.H);
r = run({ name: 'full', w: W, h: r.H + 40, dump: rects, shot: 'full.png' });
fs.writeFileSync(HERE + '/rects.json', JSON.stringify(r));

// 2. то же на 1100 — в гайде панель пассивок снята на узкой раскладке
let r11 = run({ name: 'p1100', w: 1100, h: 1000, dump: rects });
r11 = run({ name: 'p1100b', w: 1100, h: r11.H + 40, dump: rects });
fs.writeFileSync(HERE + '/rects_1100.json', JSON.stringify(r11));

// 3. подсказка по пассивке на узкой раскладке
const ptip = run({
  name: 'ptip', w: 1100, h: r11.H + 40, shot: 'ptip.png', dump: rects2,
  act: `const b = document.querySelector('.iconlist .pic.book'); b.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));`,
});
fs.writeFileSync(HERE + '/r_ptip.json', JSON.stringify(ptip));

// 4. окно выбора вещи (оружие)
const picker = run({
  name: 'picker', w: W, h: 1100, shot: 'picker.png', dump: rects2,
  act: `document.querySelectorAll('.gearrow .slot')[5].click();`,
});
fs.writeFileSync(HERE + '/r_picker.json', JSON.stringify(picker));

// 5. окно тату
const tattoo = run({
  name: 'tattoo', w: W, h: 1100, shot: 'tattoo.png', dump: rects2,
  act: `[...document.querySelectorAll('.tattoos .btn')].find(b => /Change tattoos/.test(b.textContent)).click();`,
});
fs.writeFileSync(HERE + '/r_tattoo.json', JSON.stringify(tattoo));

// 6. баффы цели
const tbuffs = run({
  name: 'tbuffs', w: W, h: 1100, shot: 'tbuffs.png', dump: rects2,
  act: `[...document.querySelectorAll('.tctl .btn')].find(b => /Buffs/.test(b.textContent)).click();`,
});
fs.writeFileSync(HERE + '/r_tbuffs.json', JSON.stringify(tbuffs));

console.log('готово');
