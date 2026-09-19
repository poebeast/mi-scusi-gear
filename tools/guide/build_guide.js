// Инструкция: node tools/guide/build_guide.js → guide.html (картинки в guide/) и превью с картинками внутри.
const fs = require('fs');
const img = (n, alt) => `<figure><img src="__IMG__/${n}.jpg" alt="${alt}" loading="lazy"></figure>`;
const steps = list => `<ol class="steps">${list.map(([t, d]) => `<li><b>${t}</b>${d ? ' — ' + d : ''}</li>`).join('')}</ol>`;
const callout = (icon, html, tone) => `<div class="callout ${tone || ''}"><span class="ci">${icon}</span><div>${html}</div></div>`;
const toggle = (title, html) => `<details class="toggle"><summary>${title}</summary><div class="tbody">${html}</div></details>`;

const body = `
<header class="cover"><div class="emoji">⚔️</div><h1>Mi scusi Gear — как пользоваться</h1>
<p class="lead">Помогает лучше разобраться в своём персонаже и подготовить его к PvP наилучшим образом: примерка гира, тату и баффов, точные статы и урон по любому классу.</p></header>

<nav class="toc"><div class="toc-t">Содержание</div>
<a href="#why">Зачем это нужно</a><a href="#char">1. Персонаж</a><a href="#gear">2. Экипировка</a><a href="#stats">3. Статы</a><a href="#tattoo">4. Тату</a><a href="#passive">5. Пассивки и клан</a><a href="#damage">6. Урон</a><a href="#buffs">7. Баффы</a><a href="#faq">Вопросы</a></nav>

<h2 id="why">Зачем это нужно</h2>
<div class="pas">
  <div class="pas-card"><div class="pas-k">😣 Проблема</div><p>Чтобы понять, как одеть персонажа и сколько он реально бьёт, приходится одевать его в игре, собирать цифры с вики по кускам и считать формулы в голове. А у каждого в группе своя табличка.</p></div>
  <div class="pas-card"><div class="pas-k">🔥 Чем это плохо</div><p>Ошибка с SA, сетом или тату стоит адены и недель фарма. На глаз не понять, что сильнее: +2 заточки или другой SA. В PvP не видно, сколько урона ты нанесёшь конкретному классу в его реальном гире и каким умением его быстрее снять. Окно персонажа в игре не объясняет, откуда берутся цифры.</p></div>
  <div class="pas-card sol"><div class="pas-k">✅ Решение</div><p><b>Mi scusi Gear</b> помогает разобраться в персонаже и подготовить его к PvP. Примеряешь вещи, заточку, SA, тату и баффы и сразу видишь статы, как в окне персонажа. Видно, что реально даёт каждая вещь и какой вариант сильнее против нужного класса в его гире. Всё общее: что настроил один, видят все.</p></div>
</div>
${callout('💡', 'Данные — только с вики <b>masterwork.wiki / Lu4 Gamma</b> и из серверных формул. Статы всех 32 классов на уровнях 1–75 сверены с серверными формулами.')}

<h2 id="char">1. Персонаж</h2>
<p>Здесь по одному персонажу на каждый класс второй профессии. Выбираешь класс, и вся страница показывает его.</p>
${img('01-character', 'Строка персонажа')}
${steps([['Character', 'список всех 32 классов, сгруппированных по расам. Выбери, кого настраивать.'], ['Name', 'ник в игре, по желанию. Виден в списке и в таблице урона.'], ['Level', 'уровень 1–75. От него зависят HP/MP/CP, статы и уровни умений.'], ['Статус сохранения', '«Live · shared» — изменения сохранены и видны всей группе. «Saving…» — идёт сохранение. «Saved in this browser» — нет связи с базой, правки пока только у тебя.']])}
${callout('🔁', 'Сохранять ничего не нужно: любое изменение уходит в общую базу само через секунду.')}

<h2 id="gear">2. Экипировка</h2>
${img('02-gear', 'Карточка персонажа и слоты')}
${steps([['Карточка', 'класс, раса и уровень. Раса берётся из класса автоматически.'], ['Сет', 'собранный комплект. Если все части заточены на +3 и выше, рядом будет бонус заточки сета.'], ['Full gear / Empty', 'надето всё или каких слотов не хватает.'], ['Слот', '<b>клик</b> открывает выбор вещи, <b>наведение</b> показывает её характеристики.'], ['«—» в слоте', 'слот занят вещью на два слота: штаны под цельной бронёй, щит при луке или двуручном оружии.']])}
<h3>Окно выбора вещи</h3>
${img('03-picker', 'Окно выбора вещи')}
${steps([['Enchant − / +', 'заточка от +0 до +16. Статы и бонус зарядов пересчитываются сразу.'], ['SA', 'особое свойство оружия, если у вещи есть варианты.'], ['Unequip', 'снять вещь.'], ['Поиск', 'по названию.'], ['All / B / A', 'фильтр по грейду.'], ['Клик по строке', 'надеть. Заточка переносится на новую вещь.']])}
${callout('🖱️', 'На широком экране окно открывается сбоку и не мешает: можно сразу кликать по другим слотам.')}

<h2 id="stats">3. Статы</h2>
${img('04-stats', 'Статы')}
${steps([['CP / HP / MP', 'с учётом CON/MEN, вещей, пассивок, клана и баффов.'], ['Боевые статы', 'P. Atk., M. Def., скорости, крит, щит — те же цифры, что в окне персонажа в игре.'], ['Атрибуты', '<span class="g">зелёный</span> — выше базового, <span class="r">красный</span> — ниже. Наведение показывает базу.'], ['Set bonus', 'какие сеты работают и их заточка.'], ['Effects not counted', 'эффекты, которые в статы не входят: шансовые срабатывания и условия вроде «при HP ниже…».']])}
${toggle('Насколько это точно?', '<p>Движок сверен с окном персонажа в игре (Swordsinger 75: HP, MP, CP, атака, защита, скорость атаки и крит сошлись) и с серверными формулами Lu4 на 2 400 расчётах. Надетая вещь заменяет базу своего слота, как в игре.</p>')}

<h2 id="tattoo">4. Тату</h2>
${img('05-tattoos', 'Тату')}
${steps([['Символы', 'три слота, как в игре. Наведение — что даёт тату, клик — открыть окно тату.'], ['Итог', 'сколько тату дают в сумме к каждому атрибуту.'], ['Change tattoos', 'открыть окно тату.']])}
${img('06-tattoo-window', 'Окно тату')}
${steps([['Строка тату', 'какой атрибут поднять, на сколько, какой понизить и тип краски (Greater 1:1 или обычная −n−1).'], ['×', 'очистить слот.'], ['Apply', 'применить все три тату сразу.']])}
${callout('⚠️', 'Все тату вместе поднимают один атрибут максимум на <b>+5</b>. Лишнее окно просто не даст выбрать.', 'warn')}

<h2 id="passive">5. Пассивки и клан</h2>
${img('07-passives', 'Пассивные умения')}
${steps([['Иконка', 'пассивка и её уровень на текущем уровне персонажа. Наведение — описание.'], ['Бирюзовая точка', 'пассивка из книги (Fighter’s / Archer’s / Magician’s Will). Клик отмечает её изученной или нет.'], ['Серая иконка', 'сейчас не работает: нужно другое оружие или броня. Причина есть в подсказке.']])}
${img('08-clan', 'Клан-скилы')}
${steps([['Галочка', 'включить клан-скилы для персонажа.'], ['Иконка', 'клик меняет уровень по кругу 1 → 2 → 3.']])}

<h2 id="damage">6. Урон</h2>
<p>PvP-урон выбранного персонажа по любому другому классу. Учитываются гир, тату, пассивки, клан и баффы обеих сторон.</p>
${img('09-damage-setup', 'Настройка урона')}
${steps([['Attacker', 'атакующий — персонаж, выбранный вверху страницы.'], ['Target', 'цель — любой другой класс.'], ['Swap', 'поменять атакующего и цель местами.'], ['Position / Soulshot / Spiritshot', 'позиция (сбоку и сзади крит выше, щит блокирует только спереди) и заряды.'], ['Строка цели', 'защита, HP и CP цели и итоговые множители зарядов. Заточка оружия даёт +0,7% к заряду за уровень.'], ['Гир цели', 'переодевай цель прямо здесь: клик по слоту открывает то же окно выбора вещи.'], ['Уровень, тату, Buffs, Clan skills цели', 'всё, что влияет на её защиту.']])}
${img('11-target-buffs', 'Баффы цели')}
<p class="cap">Кнопка <b>Buffs</b> у цели открывает её баффы сбоку. Таблица урона пересчитывается сразу.</p>
${img('10-damage-table', 'Таблица урона')}
${steps([['Hit / Crit', 'урон обычного удара и крита. Average — средний с учётом шанса крита, промахов и блока.'], ['Cycle', 'как часто можно бить этим умением: большее из перезарядки и времени применения.'], ['DPS', 'урон в секунду, если бить только этим. Таблица отсортирована по нему.'], ['CP+HP in', 'за сколько секунд эта строка в одиночку снимет цели весь CP и HP.'], ['Серая строка', 'умение недоступно с текущим оружием: «needs a dagger», «not with a bow».']])}
${toggle('Что учитывается и что нет', '<p><b>Учитывается:</b> P. Atk./M. Atk. и защиты обеих сторон, крит и крит-урон, PvP-бонусы, заряды и бонус заточки, щит, позиция, игнор защиты, формулы ударов кинжалом и звуковых умений.</p><p><b>Пока нет:</b> атрибуты (огонь/вода…), заточка умений, дебаффы на цели, урон питомцев, дистанция для лука.</p>')}

<h2 id="buffs">7. Баффы</h2>
${img('12-buffs', 'Баффы')}
${steps([['Группа класса', 'свои умения класса и баффы, которые дают другие классы.'], ['Иконка', 'клик — включить или выключить. Число — уровень баффа.'], ['Подсвеченная', 'бафф включён и уже учтён в статах.'], ['PT / TG', 'PT — бафф на группу, TG — переключаемое умение (стойка, аура).'], ['Remove all', 'снять все баффы.']])}
${img('13-active-buffs', 'Активные баффы')}
${steps([['Активные баффы', 'список включённых. Можно сменить уровень или убрать ×.']])}
${callout('🧩', 'Одинаковые баффы не складываются: «Mass X» заменяет «X». Уровень баффа берётся по уровню персонажа того класса, который его даёт.')}

<h2 id="faq">Вопросы</h2>
${toggle('Где хранятся мои изменения?', '<p>В общей базе группы. Все видят одно и то же, правки приходят без перезагрузки.</p>')}
${toggle('Почему цифры чуть отличаются от игры?', '<p>Не учтены атрибуты и эффекты, которые срабатывают по условию: они перечислены в «Effects not counted in stats». Если нашёл расхождение, пришли скрин окна персонажа, поправим.</p>')}
${toggle('Можно ли сравнить два варианта гира?', '<p>Да: открой таблицу урона и меняй вещь в слоте — DPS и «CP+HP in» пересчитываются сразу.</p>')}
`;

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
