const q = (s, i) => { const l = document.querySelectorAll(s); return l[i || 0]; };
const R = el => { if (!el) return null; const r = el.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top + scrollY), Math.round(r.width), Math.round(r.height)]; };
const TXT = el => { if (!el) return null; const rg = document.createRange(); rg.selectNodeContents(el); const r = rg.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top + scrollY), Math.round(r.width), Math.round(r.height)]; };
const map = {
  lblChar: TXT(q('label[for="char-select"]')), lblNick: TXT(q('label[for="char-nick"]')), lblLvl: TXT(q('label[for="char-level"]')), tgPT: R(q('.buffgroups .bg:nth-child(2) .buff .tg')),
  H: document.documentElement.scrollHeight,
  top: R(q('.top')), save: R(q('.save')), charbar: R(q('.charbar')), charsel: R(q('#char-select')), nick: R(q('#char-nick')), lvl: R(q('.lvl')),
  stage: R(q('.stage')), who: R(q('.who')), sets: R(q('.setchips')), worn: R(q('.wornnote')), gear: R(q('.gearrow')), slotW: R(q('.gearrow .slot', 5)), slot0: R(q('.gearrow .slot', 0)), slotLocked: R([...document.querySelectorAll('.gearrow .slot')].find(b => b.disabled)),
  stats: R(q('.stats')), bars: R(q('.stats .bars')), grid: R(q('.stats .grid2')), attrs: R(q('.stats .attrs')), misc: R(q('.stats .misc')), notes: R(q('.stats details')),
  tat: R(q('.tattoos')), hrow: R(q('.tattoos .hrow')), hsum: R(q('.tattoos .hsum')), hbtn: R(q('.tattoos .hbtnrow')),
  pas: R(q('.lcol > .passives')), pic: R(q('.iconlist .pic')), picBook: R(q('.iconlist .pic.book')), picOff: R(q('.iconlist .pic.off')),
  clan: R(q('.clan')), clanSw: R(q('.clanhead .switch')), clanItem: R(q('.clanitem')),
  dmg: R(q('.dmg')), duel: R(q('.duel')), att: R(q('.duel .duelist', 0)), tsel: R(q('.duel .duelist select')), swap: R([...document.querySelectorAll('.duel .btn')].find(b => /Swap/.test(b.textContent))), dctl: R(q('.dctl')),
  tline: R(q('.dtarget')), tedit: R(q('.tedit')), tgear: R(q('.tgear')), tctl: R(q('.tctl')), tbuffs: R([...document.querySelectorAll('.tctl .btn')].find(b => /Buffs/.test(b.textContent))),
  table: R(q('.dtable')), thHit: R(q('.dtable th', 1)), thCyc: R(q('.dtable th', 5)), thDps: R(q('.dtable th', 6)), thKill: R(q('.dtable th', 7)), rowOff: R(q('.dtable tr.off')), rot: R(q('.dtable tr.rot')),
  buffs: R([...document.querySelectorAll('.sect')].find(s => s.getAttribute('aria-label') === 'Buffs')), bg0: R(q('.buffgroups .bg')), buff0: R(q('.buffgroups .buff')), buffOn: R(q('.buffgroups .buff.on')), tgBadge: R(q('.buffgroups .buff .tg')), active: R(q('.active')), removeAll: R([...document.querySelectorAll('.sect .btn')].find(b => /Remove all/.test(b.textContent))),
};
const p = document.createElement('pre'); p.id = 'out'; p.textContent = JSON.stringify(map); document.body.append(p);
