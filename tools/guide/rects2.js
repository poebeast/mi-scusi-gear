const q = (s, i) => document.querySelectorAll(s)[i || 0];
const R = el => { if (!el) return null; const r = el.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top + scrollY), Math.round(r.width), Math.round(r.height)]; };
const byText = (sel, re) => [...document.querySelectorAll(sel)].find(b => re.test(b.textContent));
const m = {
  step: R(q('#picker .step')), sa: R(q('#sa-select')), unequip: R(byText('#picker .cur .btn', /Unequip/)), search: R(q('#picker-search')), seg: R(q('#picker .dlgtools .seg')), rowSel: R(q('#picker .row.sel')),
  hedit: R(q('#picker .hedit')), hclear: R(q('#picker .hedit [aria-label^="Clear slot"]')), apply: R(byText('#picker .dlgfoot .btn', /Apply/)),
  tip: R(q('.tip:not([hidden])')), dlg: R(q('#picker[open]')),
};
const p = document.createElement('pre'); p.id = 'out'; p.textContent = JSON.stringify(m); document.body.append(p);
