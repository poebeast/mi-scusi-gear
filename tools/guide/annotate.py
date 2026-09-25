# python annotate.py (из tools/guide) — вырезает кадры из снимков capture.js и ставит номерки → img/*.jpg.
import json, os
from PIL import Image, ImageDraw, ImageFont

os.chdir(os.path.dirname(os.path.abspath(__file__)))
R = json.load(open('rects.json'))
RP = json.load(open('r_picker.json'))
RT = json.load(open('r_tattoo.json'))
RB = json.load(open('r_tbuffs.json'))
RA = json.load(open('r_addbuffs.json'))
RTIP = json.load(open('r_ptip.json'))
F = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 18)
AMBER = (251, 191, 36)
os.makedirs('img', exist_ok=True)
for f in os.listdir('img'):
    os.remove(os.path.join('img', f))


def union(*rs):
    rs = [r for r in rs if r]
    x0 = min(r[0] for r in rs); y0 = min(r[1] for r in rs)
    x1 = max(r[0] + r[2] for r in rs); y1 = max(r[1] + r[3] for r in rs)
    return [x0, y0, x1 - x0, y1 - y0]


def cut(r, h=None, top=0):
    """Та же область, но другой высоты и/или со сдвигом верха."""
    return [r[0], r[1] + top, r[2], h if h is not None else r[3] - top]


def shot(src, box, marks, name, pad=8):
    """box — (x, y, w, h) области; marks — [(номер, rect, место)], место: left / right / top / in."""
    im = Image.open(src).convert('RGB')
    x0, y0 = max(0, box[0] - pad), max(0, box[1] - pad)
    x1, y1 = min(im.width, box[0] + box[2] + pad), min(im.height, box[1] + box[3] + pad)
    im = im.crop((x0, y0, x1, y1))
    # Тёмное поле вокруг кадра: номерки стоят снаружи элементов и ничего не закрывают.
    M = 30
    big = Image.new('RGB', (im.width + 2 * M, im.height + 2 * M), (17, 18, 20))
    big.paste(im, (M, M))
    im = big; x0 -= M; y0 -= M
    d = ImageDraw.Draw(im)
    for num, r, pos in marks:
        if not r:
            continue
        x, y, rw, rh = r[0] - x0, r[1] - y0, r[2], r[3]
        if pos == 'right':
            cx, cy = x + rw + 16, y + rh / 2
        elif pos == 'top':
            cx, cy = x + min(rw / 2, 40), y - 14
        elif pos == 'bottom':
            cx, cy = x + min(rw / 2, 40), y + rh + 14
        elif pos == 'in':
            cx, cy = x + 14, y + rh / 2
        else:
            cx, cy = x - 16, y + rh / 2
        cx = min(max(13, cx), im.width - 13); cy = min(max(13, cy), im.height - 13)
        d.ellipse((cx - 12, cy - 12, cx + 12, cy + 12), fill=AMBER, outline=(20, 16, 8), width=2)
        t = str(num); tw = d.textlength(t, font=F)
        d.text((cx - tw / 2, cy - 12), t, fill=(20, 16, 8), font=F)
    im.save('img/' + name + '.jpg', quality=90)


full = 'full.png'
shot(full, union(R['top'], R['charbar']), [(1, R['charSel'], 'top'), (2, R['nick'], 'top'), (3, R['lvl'], 'top'), (4, R['guide'], 'top'), (5, R['save'], 'right')], '01-top')
shot(full, R['gear'], [(1, R['slotW'], 'top'), (2, R['slotLocked'], 'top')], '01b-gear')
shot('picker.png', cut(RP['dlg'], RP['row'][1] + RP['row'][3] - RP['dlg'][1]), [(1, RP['step'], 'top'), (2, RP['sa'], 'left'), (3, RP['rarity'], 'bottom'), (4, RP['ls'], 'top'), (5, RP['lsm'], 'left'), (6, RP['unequip'], 'right'), (7, RP['lsfx'], 'left'), (8, RP['search'], 'left'), (9, RP['seg'], 'top'), (10, RP['row'], 'left')], '02-picker')
shot(full, R['stats'], [(1, R['sub'], 'left'), (2, R['bars'], 'left'), (3, R['grid'], 'left'), (4, R['attrs'], 'left'), (5, R['misc'], 'left'), (6, R['notes'], 'left')], '03-stats')
shot(full, R['tat'], [(1, R['hrow'], 'left'), (2, R['hsum'], 'left')], '04-tattoos', pad=24)
shot('tattoo.png', cut(RT['dlg'], RT['apply'][1] + RT['apply'][3] + 10 - RT['dlg'][1]), [(1, RT['hedit'], 'left'), (2, RT['hclear'], 'right'), (3, RT['apply'], 'left')], '05-tattoo-window')
shot('ptip.png', union(R['pas'], RTIP['tip']), [(1, R['pasInfo'], 'top'), (2, R['pic'], 'left'), (3, R['picBook'], 'top'), (4, R['picOff'], 'top')], '06-passives')
shot(full, R['clan'], [(1, R['clanSw'], 'left'), (2, R['clanItem'], 'left')], '07-clan')
shot(full, union(R['dmg'][:2] + [R['dmg'][2], 10], R['tedit']), [(1, R['dmgInfo'], 'right'), (2, R['att'], 'left'), (3, R['tsel'], 'top'), (4, R['swap'], 'top'), (5, R['dctl'], 'left'), (6, R['tline'], 'left'), (7, R['tgear'], 'left'), (8, R['tctl'], 'left')], '08-damage-setup')
hdr = [(n, R[k], 'top') for n, k in [(1, 'thAvg'), (2, 'thCyc'), (3, 'thDps'), (4, 'thKill')]]
shot(full, union(R['table'], R['rowOff']), hdr + [(5, R['rowOff'], 'left')], '09-damage-table')
shot('tbuffs.png', cut(RB['dlg'], 520), [], '10-target-buffs', pad=0)
shot(full, cut(R['buffs'], 250), [(1, R['add'], 'top'), (2, R['removeAll'], 'top'), (3, R['chip'], 'left'), (4, R['chipX'], 'right')], '11-buffs')
shot('addbuffs.png', cut(RA['dlg'], 460), [(1, RA['bg'], 'left'), (2, RA['buff'], 'left'), (3, RA['buffOn'], 'top'), (4, RA['pt'], 'left')], '12-add-buffs', pad=0)
shot(full, [R['roster'][0], R['roster'][1], R['me'][0] + R['me'][2] + 60 - R['roster'][0], R['roster'][3]], [(1, R['me'], 'top'), (2, R['tg'], 'top')], '13-roster')
shot(full, cut(R['matchups'], 230), [(1, R['mskill'], 'left'), (2, R['mhead'], 'left'), (3, R['mrow'], 'left')], '14-matchups')
shot(full, cut(R['upgrades'], 200), [(1, R['urow'], 'left'), (2, R['apply'], 'right')], '15-upgrades')
shot(full, cut(R['impact'], 200), [(1, R['irow'], 'left')], '16-impact')
print('ok', len(os.listdir('img')))
