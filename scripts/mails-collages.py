# Les images des structures de mails (atelier, lettre, magazine, simple), choisies le 27/11.
#
#   python3 scripts/mails-collages.py
#
# Les inclinaisons et superpositions sont CUITES dans une seule image : Gmail et Outlook ignorent
# transform et position (caniemail.com). Les sources sont les visuels du site : quand Mathias
# change un visuel, on relance ce script, puis `node scripts/mails-apercus-charte.mjs`.
# Fiche : brand/charte/N-declinaisons.md, « Les structures de mails ».
import os
from PIL import Image, ImageFilter, ImageDraw
RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = os.path.join(RACINE, 'public/images/')
O = os.path.join(RACINE, 'public/images/mails/charte/structures/')
os.makedirs(O, exist_ok=True)

def ouvrir(f, larg):
    im = Image.open(P + f).convert('RGB')
    return im.resize((larg, round(im.height * larg / im.width)), Image.LANCZOS)

def poser(fond, im, cx, cy, angle, ombre=36, cadre=0):
    if cadre:
        c = Image.new('RGB', (im.width + 2 * cadre, im.height + 2 * cadre), 'white'); c.paste(im, (cadre, cadre)); im = c
    rgba = im.convert('RGBA')
    sh = Image.new('RGBA', (im.width + ombre * 4, im.height + ombre * 4), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rectangle([ombre * 2, ombre * 2 + ombre // 2, ombre * 2 + im.width, ombre * 2 + im.height + ombre // 2], fill=(0, 0, 0, 70))
    sh = sh.filter(ImageFilter.GaussianBlur(ombre * 0.6)).rotate(angle, expand=True, resample=Image.BICUBIC)
    r = rgba.rotate(angle, expand=True, resample=Image.BICUBIC)
    fond.alpha_composite(sh, (int(cx - sh.width / 2), int(cy - sh.height / 2 + 10)))
    fond.alpha_composite(r, (int(cx - r.width / 2), int(cy - r.height / 2)))

# 1. La pile de numéros, inclinés sur le papier (Polaroid « summer vibes », Artifact Uprising)
f = Image.new('RGBA', (1200, 860), (255, 255, 255, 255))
poser(f, ouvrir('v2/accueil/couverture-lisbonne-640.webp', 380), 330, 440, 9)
poser(f, ouvrir('v2/accueil/couverture-rio-700.webp', 400), 860, 430, -7)
poser(f, ouvrir('v2/accueil/couverture-aussie-640.webp', 420), 600, 450, 1.5)
f.convert('RGB').save(O + 'pile.jpg', quality=84)

# 2. Les tirages éparpillés de l'étape « vos photos » (photos à bord blanc, en vrac)
f = Image.new('RGBA', (1200, 760), (17, 17, 17, 255))
srcs = ['v2/groupes/double-wei-2-750.webp', 'v2/magazine/double-page-lagon-1000.webp', 'v2/groupes/double-ski-1-770.webp', 'v2/magazine/double-page-australie-700.webp']
pos = [(300, 260, -8), (840, 250, 6), (360, 540, 5), (880, 520, -4)]
for s, (x, y, a) in zip(srcs, pos):
    im = ouvrir(s, 460)
    poser(f, im, x, y, a, ombre=24, cadre=14)
f.convert('RGB').save(O + 'tirages-nuit.jpg', quality=84)

# 3. Les vignettes des trois étapes (carrées, recadrées)
def carre(fich, cote=560):
    im = Image.open(P + fich).convert('RGB'); s = min(im.size)
    im = im.crop(((im.width - s) // 2, (im.height - s) // 2, (im.width + s) // 2, (im.height + s) // 2))
    return im.resize((cote, cote), Image.LANCZOS)
for n, fich in [('etape-1', 'v2/accueil/reseaux-photo-telephone-480.webp'), ('etape-2', 'v2/magazine/double-page-australie-portrait-840.webp'), ('etape-3', 'v2/magazine/couverture-noosa-1000.webp')]:
    carre(fich).save(O + n + '.jpg', quality=84)

# 4. Deux demi-photos bord à bord (Wallpaper*) et la grande photo d'arrivée
ouvrir('v2/accueil/header-magazines-paysage-1792.webp', 1200).save(O + 'arrivee.jpg', quality=84)
for n, fich in [('demi-1', 'v2/magazine/couverture-noosa-1000.webp'), ('demi-2', 'v2/magazine/couverture-sicile-900.webp')]:
    im = Image.open(P + fich).convert('RGB'); h = im.height; w = round(h * 0.8)
    im = im.crop(((im.width - w) // 2, 0, (im.width + w) // 2, h)).resize((600, 750), Image.LANCZOS); im.save(O + n + '.jpg', quality=84)

# 5. La bande de tirages inclinés de la lettre (Aesop / Artifact « favorites »)
f = Image.new('RGBA', (1200, 420), (244, 244, 244, 255))
for i, (s, a) in enumerate(zip(['v2/accueil/couverture-cote-azur-360.webp', 'v2/accueil/couverture-this-night-360.webp', 'v2/magazine/couverture-sicile-450.webp', 'v2/accueil/couverture-thats-life-360.webp'], [-6, 4, -3, 7])):
    poser(f, ouvrir(s, 210), 190 + i * 275, 210, a, ombre=18)
f.convert('RGB').save(O + 'bande.jpg', quality=84)
print('ok')
