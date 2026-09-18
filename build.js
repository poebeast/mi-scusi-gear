// Сборка сайта для GitHub Pages: node build.js → docs/
const fs = require('fs');
const path = require('path');
const R = p => path.join(__dirname, p);
const read = p => fs.readFileSync(R(p), 'utf8');
const readJson = (p, d) => (fs.existsSync(R(p)) ? JSON.parse(read(p)) : d);

const items = readJson('data/items.json', []);
const sets = readJson('data/sets.json', []);
const buffs = readJson('data/buffs.json', []);
const passives = readJson('data/passives.json', {});
const clan = readJson('data/clan.json', []);
const hptab = readJson('data/hptab.json', {});
const state = readJson('data/state.json', {});

const out = R('docs');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'icons'), { recursive: true });

// Кладём только иконки, на которые ссылаются данные.
const used = new Set([...items.map(i => i.ic), ...buffs.map(b => b.ic), ...Object.values(passives).flat().map(p => p.ic), ...clan.map(c => c.ic), ...[5, 16, 30, 21, 51, 9, 24, 37].map(n => 'cls_' + n)].filter(Boolean));
const missing = [];
for (const name of used) {
  const f = R('icons/' + name + '.png');
  if (fs.existsSync(f)) fs.copyFileSync(f, path.join(out, 'icons', name + '.png'));
  else missing.push(name);
}
fs.cpSync(R('icons/art'), path.join(out, 'icons', 'art'), { recursive: true });
for (const n of [5, 16, 30, 21, 51, 9, 24, 37]) fs.copyFileSync(R('icons/class_icon_' + n + '.png'), path.join(out, 'icons', 'class_icon_' + n + '.png'));
if (missing.length) console.warn('нет иконок:', missing.length, missing.slice(0, 10).join(', '));

fs.writeFileSync(path.join(out, 'data.js'), 'window.MISCUSI_DATA=' + JSON.stringify({ items, sets, buffs, passives, clan, hptab, state }) + ';\n');
fs.copyFileSync(R('src/app.js'), path.join(out, 'app.js'));
fs.copyFileSync(R('src/style.css'), path.join(out, 'style.css'));
const cfg = fs.existsSync(R('config.js')) ? read('config.js') : 'window.MISCUSI_CONFIG = {};\n';
fs.writeFileSync(path.join(out, 'config.js'), cfg);
fs.writeFileSync(path.join(out, '.nojekyll'), '');

// Метка версии: браузеры не держат в кеше старые данные после обновления.
const V = Date.now().toString(36);
fs.writeFileSync(path.join(out, 'index.html'), `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Mi scusi Gear</title>
<meta name="description" content="Gear, enchants, SA, tattoos, buffs and stats for the Mi scusi party on Lu4 Gamma.">
<link rel="icon" href="icons/cls_5.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Onest:wght@400;500;600;700&family=Unbounded:wght@600;700&display=swap">
<link rel="stylesheet" href="style.css?v=${V}">
</head>
<body>
<div id="root"></div>
<script src="config.js?v=${V}"></script>
<script src="data.js?v=${V}"></script>
<script src="app.js?v=${V}"></script>
</body>
</html>
`);
console.log('docs/ готов:', items.length, 'предметов,', sets.length, 'сетов,', buffs.length, 'баффов,', used.size - missing.length, 'иконок');
