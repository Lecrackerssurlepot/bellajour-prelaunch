---
id: T-077
titre: Les specs d'impression des deux produits Cloudprinter ne sont pas sur le disque
domaine: produit
gravite: serieux
autonomie: avis-requis
ouvert: 2026-08-30
---
## Ce que Mathias a dit
« Adapter le PDF suivant le produit avec les règles géométriques pour construire le produit. »
## Ce que j'ai vérifié
Le code commande `magazine_sas_a4_p_fc` (20 p, agrafé) et `magazine_pb_a4_p_fc` (22-50 p,
dos carré) — `src/lib/atelier/impression.ts:64-89` — mais les specs FICHIER de ces produits
(dimensions exactes du PDF attendu, fond perdu en mm, formule d'épaisseur du dos pour la
couverture enveloppante, profil couleur) ne sont nulle part dans le dépôt. Pire : les CGV
promettent 210 × 280 mm (`cgv.ts:227-232`) alors que les références produit sont `_a4_`
(210 × 297) — écart jamais tranché.
## Ce que je propose
Les specs SONT relevées (30/08, lecture seule, `docs/reference/SPECS-CLOUDPRINTER.md`) :
les deux produits font **210 × 297 mm fini (A4 exact) + 3 mm de fond perdu**, agrafé en
multiples de 4 pages (min 8), dos carré en multiples de 2. L'écart est donc tranché par les
faits : **les CGV promettent 210 × 280, le produit fabriqué fait 210 × 297.** Reste à corriger
les CGV — texte légal, accord explicite requis (interdit nº2). Recoupe T-027 (finitions) et
T-006/T-028. La formule d'épaisseur du dos manque encore (zip de gabarits officiel, T-078).
**Question pour Mathias** : accord pour corriger les CGV de 210×280 vers 210×297 (A4) ?
## Ce qui a été fait
30/08 : specs relevées via l'API (products/info) et consignées dans
`docs/reference/SPECS-CLOUDPRINTER.md` ; le contrôle PDF de la fiche admin les utilise.

## 01/09 — Mathias : la correction attendra la refonte complète des CGV
« On corrigera avec l'intégralité des CGV (prix, papier, grammage…) ». Le format 210×297 ne
part donc pas seul : il rejoint le lot CGV avec les prix finaux (T-072), le grammage réel
(T-028) et les finitions (T-027). À traiter d'un bloc, avec relecture juriste (T-026).

## 10/09/2026 — le format et la reliure corrigés dans les CGV

Accord de Mathias le 10/09 : la fiche produit des CGV (FR/PT/EN) dit désormais « Portrait A4,
210 × 297 mm » et « Agrafée à 20 pages, dos carré collé de 24 à 60 pages, couverture souple
250 g », soit ce que Cloudprinter fabrique (`impression.ts`) et ce que dit `/magazine`. La
« couverture rigide (hardcover) » a disparu. Reste ouvert : la formule d'épaisseur du dos.


## 11/09/2026 — la formule d'épaisseur du dos est dans le code : ce ticket est fermé

C'était le dernier reste. La formule était relevée depuis le 02/09 mais inutilisable : elle
exige un grammage, et le grammage n'était pas tranché. Il l'est (T-027).

`dosMmPourPages` et `largeurCouvertureMm` (`impression.ts`) le calculent, et ne saisissent NI le
grammage NI le bulk : les deux se déduisent de `PAPIER_INTERIEUR` (`pageblock_130mcs` → 130 g,
suffixe `mcs` → bulk 0,90). Changer le papier change le dos tout seul, et `verif-atelier.ts` fige
les trois valeurs de la doc (24 p → 2,40 mm · 32 p → 2,87 · 50 p → 3,93) : un changement de
papier fait TOMBER le harnais au lieu de passer en silence.

Deux usages immédiats :
- le contrôle PDF de la fiche admin JUGE enfin la largeur d'une couverture enveloppante
  (`verdictTaillePage`, quatrième argument = la pagination). Il s'en tenait à un « constat »
  faute de savoir ce qu'elle devait mesurer ; une couverture au mauvais dos est le défaut qu'on
  ne voit jamais à l'écran et toujours sur l'objet imprimé ;
- l'écran de confirmation d'impression annonce le papier, le pelliculage, le dos et la largeur
  de couverture attendue AVANT le clic qui engage un achat.

Et les CGV sont alignées sur l'objet réel : v3.2 (11/09, accord de Mathias) corrige « couverture
rigide » en couverture souple dans les trois langues, et l'annexe nomme le papier et la finition.
