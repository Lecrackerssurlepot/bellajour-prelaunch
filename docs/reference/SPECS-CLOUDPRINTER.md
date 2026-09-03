# Specs produits Cloudprinter — relevées le 30/08/2026

Source : `POST /cloudcore/1.0/products/info` (API Cloudprinter, lecture seule, clé du projet).
Copies JSON complètes relevées le même jour. **Ces chiffres font foi — ne jamais les remplacer
par une supposition.** À re-relever si Cloudprinter change de gamme.

## Les deux produits commandés par `src/lib/atelier/impression.ts`

| Spec | `magazine_sas_a4_p_fc` (agrafé, 20 p) | `magazine_pb_a4_p_fc` (dos carré, 22-50 p) |
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

Pageblock : 90/130/150 gsm, Machine Coated Silk ou Gloss (défaut Cloudprinter : 90mcs).
Couverture : 250 gsm MCS (celle que le code pose par défaut — T-027, choix à confirmer).
Le code commande aujourd'hui `pageblock_130mcs` + `cover_250mcs` (`impression.ts:68-81`).

## ⚠️ Conséquence : l'écart CGV est tranché par les faits

Les CGV v3.0 annoncent **210 × 280 mm** (`src/app/legal/content/cgv.ts:227-232`) ; le produit
réellement fabriqué fait **210 × 297 mm**. Corriger les CGV = texte légal = accord explicite
de Mathias (interdit nº2). Voir T-077.

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

⚠️ **Rester paramétré par le grammage** : 130 gsm est le défaut posé (`impression.ts:79`) mais non
tranché (T-028 ; défaut Cloudprinter = 90 gsm). Ne pas figer 130 dans la formule.

**Largeur de la couverture enveloppante** = `2 × (210 + 3) + dos_mm` (fini+bleed des deux faces +
dos). Cloudprinter attend qu'on la **régénère à chaque commande** — c'est le sens de T-078. Le
gabarit `magazine_pb_a4_p_fc_cover.pdf` a une largeur nominale dessinée (~5,2 mm de dos), à ne pas
prendre pour la formule.

**Autres specs du gabarit** : profil couleur **Coated FOGRA39 (ISO 12647-2:2004)** ;
zone de collage du dos = 3 mm à l'intérieur de la couverture (déjà noté). Zip exact (URL de l'API,
le CDN refuse les URL devinées) : `resources.cloudprinter.com/templates/2216/magazine_pb_a4_p_fc_product.zip`.
