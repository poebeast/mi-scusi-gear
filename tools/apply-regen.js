// Раскладывает свежую выгрузку Lu4 Planner (data/raw/regen.json: { curve: {класс: {уровень: {s, pr, pas}}}, cases })
// по данным: голые персонажи 24 новых классов → planner.json (из него convert.js строит hptab, пассивки и ref2.json),
// голые персонажи 8 классов партии и случаи с гиром/баффами → ref.json. После: node convert.js && node build.js.
const fs = require('fs');
const path = require('path');
const R = p => path.join(__dirname, '..', 'data', 'raw', p);
const regen = JSON.parse(fs.readFileSync(R('regen.json'), 'utf8'));
const pj = JSON.parse(fs.readFileSync(R('planner.json'), 'utf8'));
// Ключи planner.json — id профессий планнера (dark_avenger), в выгрузке — наши (darkavenger).
const pidOf = {};
for (const pid of Object.keys(pj.curve)) pidOf[pid.replace(/_/g, '')] = pid;
const refCases = [...regen.cases];
let updated = 0;
for (const [cls, cv] of Object.entries(regen.curve)) {
  if (Object.keys(cv).length < 75) throw new Error(cls + ': ' + Object.keys(cv).length + ' уровней');
  if (pidOf[cls]) { pj.curve[pidOf[cls]] = cv; updated++; continue; }
  for (const [L, x] of Object.entries(cv))
    refCases.push({ id: cls + '-naked-' + L, char: { cls, level: +L, eq: {}, hen: [null, null, null], buffs: {} }, ref: x.s, primary: x.pr, passives: x.pas });
}
fs.writeFileSync(R('planner.json'), JSON.stringify(pj));
fs.writeFileSync(R('ref.json'), JSON.stringify({ cases: refCases }));
console.log('planner.json: классов', updated, '· ref.json: случаев', refCases.length);
