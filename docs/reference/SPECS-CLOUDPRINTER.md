# Specs produits Cloudprinter — relevées le 30/08/2026, complétées le 11/09/2026

Source : `POST /cloudcore/1.0/products/info` (API Cloudprinter, lecture seule, clé du projet).
Copies JSON complètes relevées le même jour. **Ces chiffres font foi — ne jamais les remplacer
par une supposition.** À re-relever si Cloudprinter change de gamme.

## Les deux produits commandés par `src/lib/atelier/impression.ts`

| Spec | `magazine_sas_a4_p_fc` (agrafé, 20 p) | `magazine_pb_a4_p_fc` (dos carré, 24 à 60 p, par pas de 2) |
|---|---|---|
| Reliure | Saddle Stitch (agrafé) | Perfect bind (dos carré collé) |
| Format fini (après rognage) | **210 × 297 mm** (A4 exact) | **210 × 297 mm** (A4 exact) |
| Fond perdu (bleed) | **3 mm** de chaque côté | **3 mm** de chaque côté |
| Page PDF attendue (fini + bleed) | 216 × 303 mm | 216 × 303 mm |
| Orientation | Portrait, dépendante | Portrait, dépendante |
| Pages | min. 8, **multiples de 4** | **multiples de 2** ; zone de collage du dos : 3 mm à l'intérieur de la couverture |
| Couleur | quadri recto-verso | quadri recto-verso |
| Technologie | toner numérique | toner numérique |
| Fichiers | 1 × `product` (pdf) | 2 × : `cover` (pdf) + `book` (pdf) |
| Quantité | 1 à 100 000 | 1 à 100 000 |
| Gabarits officiels (zip) | resources.cloudprinter.com/templates/2208/… | resources.cloudprinter.com/templates/2216/… |

## Papiers disponibles (options `type_main_paper` / `type_cover_paper`)

Relevé complet du 11/09/2026, identique sur les DEUX produits :

- `type_main_paper` — 80/90/130/150/170/200 gsm en Machine Coated Silk (`…mcs`) ou Gloss
  (`…mcg`), plus 90/100/120 gsm Offset (`…off`). Défaut Cloudprinter : `pageblock_90mcs`.
- `type_cover_paper` — 130/170/200/250/300/350 gsm MCS ou MCG, `cover_250off`, `cover_300ecb`.
  Défaut : `cover_250mcs` sur le dos carré, `cover_170mcs` sur l'agrafé.
- `type_book_cover_finish` — **`finish_gloss` (défaut) · `cover_finish_matte` ·
  `cover_finish_none` · `cover_finish_soft_touch`**.
- `type_total_pages` — `total_pages`. `type_book_cover_type` — `cover_double_sided` (défaut).

⚠️ **L'asymétrie `finish_gloss` / `cover_finish_matte` est la leur.** `cover_finish_gloss`
n'existe pas : une commande qui le nommerait serait refusée. Ne pas « harmoniser ».

## Ce qui est TRANCHÉ (11/09/2026) — T-027 est clos

Décision de Mathias, après ce relevé :

| | Référence |
|---|---|
| Papier intérieur | `pageblock_130mcs` — 130 g Machine Coated Silk |
| Papier de couverture | `cover_250mcs` — 250 g Machine Coated Silk |
| Pelliculage | **au choix du client** : `finish_gloss` ou `cover_finish_matte` |
| Pagination | `total_pages` |

Le même papier pour les DEUX reliures (personne ne reçoit un papier différent parce que son
histoire tenait en vingt pages). Le pelliculage vient du dossier (`numeros.finition`, migration
`20260911_atelier_finition.sql`) et se traduit en référence par `FINITION_OPTION`
(`impression.ts`). Un dossier sans choix part en `finish_gloss`, le défaut Cloudprinter.

## Prix usine relevés le 11/09/2026 (`prices/lookup`, HT, 1 exemplaire, deux passes identiques)

**Ces chiffres sont reproductibles et font foi. Ils ne sont PAS des marges** — le coût de
revient complet et la marge n'existent nulle part dans le dépôt, et n'ont rien à y faire.

Dos carré 32 p, `cover_250mcs` + `finish_gloss`, France :

| Papier intérieur | Produit | Port le moins cher | Total |
|---|---|---|---|
| `pageblock_90mcs` | 6,6551 € | 6,46 € | 13,12 € |
| `pageblock_90mcg` | 6,4507 € | 9,22 € | 15,67 € |
| **`pageblock_130mcs`** | **6,6667 €** | **9,22 €** | **15,89 €** |
| `pageblock_130mcg` | 6,8855 € | 6,46 € | 13,35 € |
| `pageblock_150mcs` | 6,7675 € | 9,22 € | 15,99 € |
| `pageblock_170mcs` | 7,1207 € | 6,46 € | 13,58 € |

Agrafé 20 p, mêmes options : `130mcs` 3,3700 € (port 9,22) · `130mcg` 4,8532 € (port 6,46) ·
`90mcs` 4,7092 € (port 6,46) · `150mcs` 3,4330 € (port 9,22) · `170mcs` 5,0002 € (port 6,46).

**Trois faits que ce relevé établit, et qu'aucune intuition ne donnait :**

1. **Le grammage ne coûte presque rien.** 90 → 130 g sur un dos carré de 32 pages : un centime
   (6,6551 → 6,6667). 130 → 170 g : 45 centimes.
2. **Le pelliculage ne coûte rien du tout.** Dos carré 32 p : 6,6667 € en `finish_gloss`,
   6,6722 € en `cover_finish_matte`. Un demi-centime. C'est ce qui permet de laisser choisir.
3. **Le papier change d'USINE, et donc de PORT.** Ce n'est pas le poids : `90mcs` et `90mcg`
   pèsent tous deux 251 g et partent l'un à 6,46 €, l'autre à 9,22 €. Cloudprinter route vers
   des partenaires différents selon l'option, et leurs transporteurs ne coûtent pas pareil.
   **Cet effet n'existe qu'en France** : au Portugal (3,7435 €, port 11,97 €) et en Allemagne
   (4,7558 €, port 6,10 €), `130mcs` et `130mcg` donnent EXACTEMENT le même prix.

Conséquence pratique : le jour où le port français pèse plus que le toucher du papier, la
bascule `mcs` → `mcg` tient en un mot dans `PAPIER_INTERIEUR` et fait baisser le port français
de 2,76 € HT. Elle ne se fait pas en douce : le dos change de bulk (0,90 → 0,80), donc la
géométrie de la couverture aussi, et le harnais le dit.

La couverture, elle, ne pèse rien : 250 → 350 g coûte 3 centimes (6,6667 → 6,6994).

⚠️ **Un poids renvoyé à 162 g pour 24, 32 ET 50 pages** apparaît sur la route « usine B ».
C'est physiquement impossible (un 32 pages A4 en 130 g pèse ~161 g, un 50 pages bien plus) :
leur devis porte un poids forfaitaire sur cette route. Le PRIX, lui, est reproductible. Ne pas
se servir de `total_weight` pour quoi que ce soit.

## ⚠️ L'écart CGV — RÉSOLU (le 10/09 pour le format, le 11/09 pour le papier)

Les CGV v3.0 annonçaient **210 × 280 mm** et une « couverture rigide » ; le produit fabriqué
fait **210 × 297 mm** en **couverture souple**. Les deux sont corrigés, sur accord explicite de
Mathias : le format en v3.1 (10/09), la couverture souple et le papier en **v3.2 (11/09)**.
L'annexe « Fiche produit » porte désormais deux lignes de plus, dans les trois langues : le
PAPIER (130 g couché satiné / 250 g) et la FINITION au choix du client, sans supplément.
⚠️ Les grammages des CGV et ceux de `PAPIER_INTERIEUR` / `PAPIER_COUVERTURE` doivent rester les
mêmes : l'un est ce qu'on promet, l'autre ce qu'on commande.

## Formule d'épaisseur du dos (spine) — TROUVÉE le 02/09/2026

Pas dans `products/info` ; atteinte via un lien-annotation du gabarit `templates/2216` renvoyant à
la doc officielle Cloudprinter (`docs.cloudprinter.com/client/how-to-calculate-spine-width` +
`/spine-width-calculator/`). **Source qui fait foi, à recopier telle quelle :**

```
dos_mm = (grammage_gsm × bulk × (nb_pages / 2)) / 1000  +  (2 × épaisseur_couverture_mm)
```

- **Bulk du papier** (valeurs moyennes Cloudprinter, peuvent varier selon l'imprimeur) :
  MCG (gloss) 0,80 · **MCS (silk) 0,90** · ECB 1,20 · OFF 1,22.
- **Terme couverture `2 × épaisseur`** selon la reliure : Case Wrap 3 mm → 6,0 · Case Wrap 2 mm →
  4,0 · **Perfect Binding / Softcover → 1,0** (2 × 0,5). Notre `magazine_pb_a4_p_fc` est un
  **softcover → terme +1,0 mm**.

**Appliqué au produit Bellajour** (`pageblock_130mcs` = 130 gsm MCS bulk 0,90, softcover +1,0) :
24 p → **2,404 mm** · 32 p → **2,872 mm** · 50 p (max) → **3,925 mm**. Ces valeurs sortent de la
formule, elles ne sont pas inventées.

✅ **ELLE EST DANS LE CODE DEPUIS LE 11/09/2026** — `dosMmPourPages` et `largeurCouvertureMm`
(`impression.ts`). Le grammage et le bulk ne sont PAS saisis : ils se déduisent de la référence
`PAPIER_INTERIEUR` (`pageblock_130mcs` → 130 g, suffixe `mcs` → bulk 0,90). Changer le papier
change le dos, sans que personne n'ait à s'en souvenir — et `scripts/verif-atelier.ts` fige les
trois valeurs (24 p → 2,40 · 32 p → 2,87 · 50 p → 3,93), donc un changement de papier FAIT
TOMBER le harnais au lieu de passer en silence.

Premier usage : le contrôle PDF de la fiche admin JUGE enfin la largeur d'une couverture
enveloppante (`verdictTaillePage`, quatrième argument = la pagination du dossier). Avant le
11/09 il se contentait d'un « constat » faute de savoir ce qu'elle devait mesurer ; une
couverture au mauvais dos est le défaut qu'on ne voit jamais à l'écran et toujours sur l'objet.
L'écran de confirmation d'impression annonce le dos et la largeur attendue avant le clic.

⚠️ `souvenir.ts` continue de MESURER le dos sur la feuille déposée, et c'est voulu : il découpe
un fichier réel pour le montrer, il ne fabrique rien. Juger et découper ne sont pas le même
geste.

**Largeur de la couverture enveloppante** = `2 × (210 + 3) + dos_mm` (fini+bleed des deux faces +
dos). Cloudprinter attend qu'on la **régénère à chaque commande** — c'est le sens de T-078. Le
gabarit `magazine_pb_a4_p_fc_cover.pdf` a une largeur nominale dessinée (~5,2 mm de dos), à ne pas
prendre pour la formule.

**Autres specs du gabarit** : profil couleur **Coated FOGRA39 (ISO 12647-2:2004)** ;
zone de collage du dos = 3 mm à l'intérieur de la couverture (déjà noté). Zip exact (URL de l'API,
le CDN refuse les URL devinées) : `resources.cloudprinter.com/templates/2216/magazine_pb_a4_p_fc_product.zip`.
