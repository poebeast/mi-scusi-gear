import json, os
from PIL import Image, ImageDraw, ImageFont

R = json.load(open('rects.json'))
R11 = json.load(open('rects_1100.json'))
RP = json.load(open('r_picker.json'))
RT = json.load(open('r_tattoo.json'))
RTIP = json.load(open('r_ptip.json'))
RB = json.load(open('r_tbuffs.json'))
# Окна прижаты к правому краю. В момент замера видимая область на 16 px уже, чем на снимке
# (полоса прокрутки), поэтому их координаты сдвигаем.
for D in (RP, RT, RB):
    for k, v in D.items():
        if v: v[0] += 16
F = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 20)
AMBER = (251, 191, 36)
os.makedirs('img', exist_ok=True)


def union(*rs):
    rs = [r for r in rs if r]
    x0 = min(r[0] for r in rs); y0 = min(r[1] for r in rs)
    x1 = max(r[0] + r[2] for r in rs); y1 = max(r[1] + r[3] for r in rs)
    return [x0, y0, x1 - x0, y1 - y0]


def shot(src, box, marks, name, pad=44):
    """box — (x, y, w, h) области; marks — [(номер, rect, обвести?)] — всё в координатах скриншота."""
    im = Image.open(src).convert('RGB')
    x0, y0 = max(0, box[0] - pad), max(0, box[1] - pad)
    x1, y1 = min(im.width, box[0] + box[2] + pad), min(im.height, box[1] + box[3] + pad)
    im = im.crop((x0, y0, x1, y1))
    d = ImageDraw.Draw(im)
    # Номерок рядом с элементом: слева по центру, а если слева нет места — над левым верхним углом.
    for num, r, outline in marks:
        if not r:
            continue
        x, y, rw, rh = r[0] - x0, r[1] - y0, r[2], r[3]
        pos = outline if isinstance(outline, str) else 'left'
        if pos == 'right':
            cx, cy = x + rw + 30, y + rh / 2
        elif pos == 'top':
            cx, cy = x + rw / 2, max(16, y - 18)
        elif x - 20 >= 16:
            cx, cy = x - 20, y + rh / 2
        else:
            cx, cy = max(16, x + 10), max(16, y - 18)
        d.ellipse((cx - 14, cy - 14, cx + 14, cy + 14), fill=AMBER, outline=(20, 16, 8), width=2)
        t = str(num); tw = d.textlength(t, font=F)
        d.text((cx - tw / 2, cy - 14), t, fill=(20, 16, 8), font=F)
    im.save('img/' + name + '.jpg', quality=90)


full = 'full.png'
shot(full, union(R['top'], R['charbar']), [(1, R['lblChar'], 'right'), (2, R['lblNick'], 'right'), (3, R['lblLvl'], 'right'), (4, R['save'], 'left')], '01-character')
shot(full, R['stage'], [(1, R['who'], True), (2, R['sets'], True), (3, R['worn'], True), (4, R['slotW'], 'top'), (5, R['slotLocked'], 'top')], '02-gear')
shot('picker.png', RP['dlg'][:3] + [420], [(1, RP['step'], 'top'), (2, RP['sa'], 'left'), (3, RP['unequip'], 'right'), (4, RP['search'], 'left'), (5, RP['seg'], 'top'), (6, RP['rowSel'], 'left')], '03-picker')
shot(full, R['stats'], [(1, R['bars'], True), (2, R['grid'], True), (3, R['attrs'], True), (4, R['misc'], True), (5, R['notes'], True)], '04-stats')
shot(full, R['tat'], [(1, R['hrow'], 'left'), (2, R['hsum'], True), (3, R['hbtn'], True)], '05-tattoos')
shot('tattoo.png', RT['dlg'][:3] + [RT['apply'][1] + RT['apply'][3] + 14 - RT['dlg'][1]], [(1, RT['hedit'], 'left'), (2, RT['hclear'], 'top'), (3, RT['apply'], 'left')], '06-tattoo-window')
shot('ptip.png', union(R11['pas'], RTIP['tip']), [(1, R11['pic'], 'top'), (2, R11['picBook'], 'top'), (3, R11['picOff'], 'left')], '07-passives')
shot(full, R['clan'], [(1, R['clanSw'], True), (2, R['clanItem'], 'top')], '08-clan')
shot(full, [R['dmg'][0], R['dmg'][1], R['dmg'][2], R['tedit'][1] + R['tedit'][3] - R['dmg'][1]], [(1, R['att'], True), (2, R['tsel'], 'top'), (3, R['swap'], 'right'), (4, R['dctl'], True), (5, R['tline'], True), (6, R['tgear'], True), (7, R['tctl'], True)], '09-damage-setup')
hdr = [(n, (R[k][0] + R[k][2] - 30, R[k][1] + 4, 24, 20), 'top') for n, k in [(1, 'thHit'), (2, 'thCyc'), (3, 'thDps'), (4, 'thKill')]]
shot(full, [R['table'][0], R['table'][1] - 20, R['table'][2], R['table'][3] + 20], hdr + [(5, R['rowOff'], True)], '10-damage-table')
shot('tbuffs.png', RB['dlg'][:3] + [560], [], '11-target-buffs', pad=0)
shot(full, [R['buffs'][0], R['buffs'][1], R['buffs'][2], R['bg0'][1] + R['bg0'][3] - R['buffs'][1]], [(1, R['bg0'], True), (2, R['buff0'], 'left'), (3, R['buffOn'], 'top'), (4, R['tgPT'], 'left'), (5, R['removeAll'], True)], '12-buffs')
shot(full, [R['active'][0], R['active'][1] - 24, R['active'][2], R['active'][3] + 24], [(1, R['active'], True)], '13-active-buffs')
print('ok')
