// Инструкция: node tools/guide/build_guide.js → guide.html (картинки в guide/) и превью с картинками внутри.
const fs = require('fs');
const img = (n, alt) => `<figure><img src="__IMG__/${n}.jpg" alt="${alt}" loading="lazy"></figure>`;
const steps = list => `<ol class="steps">${list.map(([t, d]) => `<li><b>${t}</b>${d ? ' — ' + d : ''}</li>`).join('')}</ol>`;
const callout = (icon, html, tone) => `<div class="callout ${tone || ''}"><span class="ci">${icon}</span><div>${html}</div></div>`;
const toggle = (title, html) => `<details class="toggle"><summary>${title}</summary><div class="tbody">${html}</div></details>`;

// Текст гайда — в body.js.
const body = require('./body.js')({ img, steps, callout, toggle });

const css = `
:root{--bg:#191919;--bg2:#202020;--bg3:#2a2a2a;--ink:rgba(255,255,255,.86);--ink2:rgba(255,255,255,.6);--line:rgba(255,255,255,.09);--accent:#fbbf24;--g:#4ade80;--r:#f87171}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.65 ui-sans-serif,-apple-system,"Segoe UI",Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased}
main{max-width:860px;margin:0 auto;padding:56px 24px 96px}
.cover .emoji{font-size:64px;line-height:1}
h1{font-size:40px;line-height:1.15;margin:16px 0 8px;font-weight:700;letter-spacing:-.01em}
.lead{color:var(--ink2);font-size:18px;margin:0 0 24px}
h2{font-size:26px;margin:48px 0 10px;padding-top:8px;font-weight:650;scroll-margin-top:16px}
h3{font-size:19px;margin:28px 0 8px;font-weight:600}
p{margin:6px 0 12px}
.toc{display:flex;flex-wrap:wrap;gap:4px 14px;padding:12px 16px;border-radius:8px;background:var(--bg2);border:1px solid var(--line);margin:8px 0 8px}
.toc-t{width:100%;font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--ink2)}
.toc a{color:var(--ink);text-decoration:none;border-bottom:1px solid rgba(255,255,255,.2)}
.toc a:hover{border-color:var(--accent)}
main a:not(.toc a){color:var(--accent);text-decoration:none;border-bottom:1px solid rgba(251,191,36,.4)}
main a:not(.toc a):hover{border-color:var(--accent)}
figure{margin:14px 0 8px}
figure img{display:block;max-width:100%;border-radius:8px;border:1px solid var(--line);box-shadow:0 8px 28px rgba(0,0,0,.35)}
.steps{counter-reset:s;list-style:none;padding:0;margin:8px 0 16px}
.steps li{counter-increment:s;position:relative;padding:6px 0 6px 40px;border-bottom:1px solid var(--line)}
.steps li:last-child{border-bottom:0}
.steps li::before{content:counter(s);position:absolute;left:0;top:7px;width:26px;height:26px;border-radius:50%;background:var(--accent);color:#1a1204;font:700 14px/26px ui-sans-serif,"Segoe UI",sans-serif;text-align:center}
.steps b{color:#fff}
.callout{display:flex;gap:12px;padding:14px 16px;border-radius:8px;background:var(--bg3);margin:14px 0}
.callout .ci{font-size:20px;line-height:1.4}
.callout.warn{background:rgba(251,191,36,.1)}
.toggle{margin:8px 0;border-radius:6px}
.toggle summary{cursor:pointer;padding:6px 4px;font-weight:600;list-style:none}
.toggle summary::before{content:"▸";display:inline-block;width:20px;color:var(--ink2);transition:transform .15s}
.toggle[open] summary::before{transform:rotate(90deg)}
.tbody{padding:0 4px 4px 24px;color:var(--ink)}
.cap{color:var(--ink2);font-size:14px;margin-top:-2px}
.g{color:var(--g);font-weight:600}.r{color:var(--r);font-weight:600}
.pas{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:12px 0}
.pas-card{padding:14px 16px;border-radius:8px;background:var(--bg2);border:1px solid var(--line)}
.pas-card.sol{background:rgba(74,222,128,.08);border-color:rgba(74,222,128,.25)}
.pas-k{font-weight:700;margin-bottom:4px}
.pas-card p{margin:0;font-size:15px;color:var(--ink)}
@media (max-width:760px){.pas{grid-template-columns:1fr}h1{font-size:32px}}
`;
const page = src => `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Mi scusi Gear — Guide</title><style>${css}</style></head><body><main>${body.replace(/__IMG__/g, src)}</main></body></html>
`;
fs.writeFileSync(__dirname + '/guide.html', page('guide'));
// Превью: картинки внутри файла
let prev = page('img');
prev = prev.replace(/src="img\/([^"]+)"/g, (m, f) => `src="data:image/jpeg;base64,${fs.readFileSync(__dirname + '/img/' + f).toString('base64')}"`);
fs.writeFileSync(__dirname + '/Mi-scusi-guide-preview.html', prev);
console.log('ok', (prev.length / 1024 / 1024).toFixed(1) + ' MB');
