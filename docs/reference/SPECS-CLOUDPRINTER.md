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

## Ce que ce relevé ne donne pas

La **formule d'épaisseur du dos** (spine) pour la couverture enveloppante du dos carré n'est
pas dans `products/info` — elle est vraisemblablement dans le zip de gabarits officiel
(templates/2216). À relever avant de générer une couverture `cover` automatiquement (T-078).
