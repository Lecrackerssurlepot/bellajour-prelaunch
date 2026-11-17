# C19 : les doubles signature (le goût de la vitrine du 14/11)

**Statut** : EN PROD le 16/11 (#371, vague 2 du 16/11, T-214). Règles R180 à R185
(`docs/reference/REGLES-TRI.md`). Essai Affinity de l'ombre douce FIDÈLE le 16/11 (D28, suite du 16/11).

Mathias, 16/11, après la vitrine Merisa : « j'adore les présentations que tu as pu faire […] je trouve ça très intéressant qu'il y ait
un minimum de goût qui puisse être développé ». Le 14/11, sur l'éditeur : « Tes mises en page ne sont pas impressionnantes. » Il juge
à l'œil : le livrable est la planche « vitrine | éditeur » de chaque signature (recette ci-dessous).

## Ce qu'elle fait
- Onze gabarits de DOUBLE tirés des deux directions de la vitrine (`design-explorations/vitrine-2026-11-14/`), `origine: "signature"`,
  ids stables `SG-01` à `SG-11` (`src/lib/mise-en-page/signatures.ts`). Ce sont des gabarits DESSINÉS, rangés à la suite de l'annexe
  et des épingles (l'ordre de `candidats` et le premier choix de `poser` ne bougent pas) ; dans l'éditeur, leur NOTE les met devant
  quand ils conviennent aux photos (R183).
- Quatre briques, chacune testée :
  1. **le texte tiré des FAITS** (R180) : un cadre peut porter `fait` (le jour, la date courte ou longue, l'heure, le jour et l'heure,
     la date et l'heure, le repère « mois · lieu sûr · heure », le lieu daté, le lieu de la page, la période du dossier). Tant que rien
     n'est écrit, il se montre et s'exporte avec ce fait, calculé comme le lieu par défaut (`lieuxParDefaut`, `texteDeFait`), jamais
     stocké ; sans date, rien, et un cadre vide n'est jamais imprimé (D2). Les faits d'une photo se lisent sur la k-ième photo pour le
     k-ième cadre qui en porte un (l'heure sous chaque vignette).
  2. **le GÉANT ajusté** (R181) : `geant: true` sur un titre ; son corps est le plus grand qui tient dans le cadre (largeur ET hauteur,
     mots entiers, chasses de la police, approche et capitales du niveau), au demi-point, jusqu'à `REGLAGES_GEANT.CORPS_MAX` (720 pt).
     `corpsGeant` reprend EXACTEMENT le calcul de `ajusterTitre` (C13) : l'écran (`cadresPlanche`), l'IDML et le PDF lisent la même
     valeur, que `ajusterTitre` garde. Seul `PointSize` change dans l'IDML (D28 tient). Sans style : chasses d'Arial Bold, comme le
     mot-titre de la couverture.
  3. **le FOND PROPOSÉ** (R182) : `Template.fond` (un rôle du nuancier par côté). Quand la signature ARRIVE sur une planche sans fond,
     `composer` pose ce fond dans `Planche.fond` (le même geste : Annuler retire la pose et le fond) ; ensuite c'est une couleur libre
     comme une autre (C15). Jamais par-dessus une couleur choisie ; jamais un aplat dans le gabarit (T-209).
  4. **l'OMBRE DOUCE des tirages** (R184) : `ombre: true` sur une photo. Écran : une ombre CSS ; PDF : douze couches noires en produit,
     du plus large au plus étroit (pdf-lib ne floute pas) ; IDML : l'élément `DropShadowSetting` de l'essai du 29/10 « photo avec ombre
     portée (cadre) », copié attribut pour attribut, placé comme dans l'essai. Mêmes nombres partout (`OMBRE_DOUCE` : 35 %, 5 mm de flou,
     2 mm sous le tirage). Un cadre sans ombre n'écrit rien : les IDML et PDF d'avant sont identiques à l'octet.

## L'inventaire de la vitrine (16/11)
Hors de ce lot, listés seulement : le détourage (masque), le noir et blanc, l'écriture manuscrite, l'alignement sur l'horizon détecté,
la correction d'exposition.

| Vitrine | Ce que l'éditeur savait déjà | Ce qui manquait | Verdict |
|---|---|---|---|
| Éditoriale, couverture (photo pleine, titre en capitales dans la zone calme, 4e en aplat de la photo, photo jumelle) | 1re pleine + mot-titre ajusté (CV-01), petite photo de 4e (CV-02), aplat de 4e | aplat PRIS dans la photo de 1re (la couverture n'a pas de fond libre), titre calé sous l'horizon, photo jumelle calée sur le même horizon | après une brique (fond libre de couverture) : pas fait |
| Éditoriale, double 1 (le jour en chiffre géant, repère, chapô, pleine page) | pleine page, titre, légende | le géant ajusté, le jour et le repère tirés des faits | **SG-01 Le chiffre du jour** |
| Éditoriale, double 2 (le mot dans l'eau, planche de 12 vignettes, l'heure sous chacune) | E-D8d (pleine + 3 × 3) | l'heure sous chaque vignette, la date et l'heure, le mot géant blanc | **SG-03 La planche du jour** (9 vignettes : 12 photos au plus par double) |
| Éditoriale, double 3 (deux pleines du même moment, titre dans le brouillard, une ligne qui traverse) | E-D1 (deux pleines) | le titre géant, le lieu daté, l'heure de la seconde | **SG-05 Deux pages, un moment** |
| Éditoriale, double 4 (une photo traverse le pli, une ligne) | photo sur toute la double, pli pénalisé (C05) | la date et l'heure par défaut | **SG-07 Le pli dans l'eau** |
| Éditoriale, double 5 (le saut, l'aplat de l'eau, les mots en géant, une vignette) | fond libre (C15), titre | le fond proposé, le géant, la vignette et ses heures | **SG-08 Les mots sur l'aplat** |
| Éditoriale, double 6 (deux soirs en miroir, la dernière photo minuscule, la période) | photos libres | les légendes « jour · heure », la période du dossier | **SG-11 Deux soirs en miroir** |
| Audacieuse, couverture (titre ajusté posé sur l'horizon, couleur d'une autre photo, tirage tourné, date manuscrite) | mot-titre ajusté, tirage à bord blanc | l'horizon détecté, l'écriture manuscrite, le fond libre de couverture | pas maintenant |
| Audacieuse, double 1 (le jour peint sur la piste, bandes du seuil) | photo sur toute la double | le géant blanc, le repère ; les bandes sont des aplats (refusés dans un gabarit, T-209) | **SG-02 La date sur la photo** (sans les bandes) |
| Audacieuse, double 2 (douze photos en vrac, l'heure sur chaque case, la date géante) | mosaïques E-D12 | la mosaïque à deux tailles de la vitrine, l'heure sur chaque case, la date courte géante | **SG-04 La journée en vrac** (sans la correction d'exposition) |
| Audacieuse, double 3 (le nom du lieu en géant, fond de brume, couleur de terre) | fond libre, titre | le géant sur deux lignes, le fond proposé, la couleur du titre par rôle | **SG-06 Le nom en grand** |
| Audacieuse, double 4 (tirages jetés sur le jaune, ombre, un grand à cheval sur le pli) | scrapbook E-D13 (bord blanc, rotation) | l'ombre douce, le fond proposé, la disposition de la vitrine | **SG-09 Les tirages jetés** (sans l'écriture manuscrite) |
| Audacieuse, double 5 (les plongeons passent devant les lettres) | deux pleines, titre | le DÉTOURAGE (sans lui, les lettres cachent le plongeur) | pas maintenant |
| Audacieuse, double 6 (bande de photomaton N&B sur l'orange des toits, la phrase en grand) | bord blanc, rotation | la bande tournée d'un bloc, le fond proposé, la période | **SG-10 La bande photomaton** (en couleur, sans ombre) |

## Ce qui reste en dessous de la vitrine (avis franc, recette du 16/11)
- **Typographie** : une paire par magazine. Sous T-01, le titre est en CAPITALES (« LA MER », « LES MONTAGNES ») et le chapô en Hanken
  Grotesk, là où la vitrine écrit « La mer » en Bodoni bas-de-casse et son chapô en Bodoni. Sous T-07, les légendes sont en Source Serif,
  là où la vitrine met des capitales grasses condensées. Pas d'alignement à droite (export) : les légendes symétriques du miroir sont
  toutes deux à gauche.
- **Alignements entre pages** : rien ne cale un titre ou une grille sur l'horizon de la photo d'en face (brique 3 des notes de la
  vitrine) : les hauteurs sont celles de la vitrine, justes pour CES photos seulement.
- **Les photos** : le cache fait 1 500 px ; « Le pli dans l'eau » tient ≈ 90 dpi sur 426 mm (la vitrine lisait l'original de 3 900 px).
- **Les textes** : la lecture IA ne nomme pas le Pico Ruivo (la recette l'écrit à la main) ; la couleur de terre de « Le nom en grand »
  devient le rôle aplat sourd (l'orange) : un nuancier n'a que six rôles.
- **Absents** : bandes du seuil (aplats), écriture manuscrite, noir et blanc, détourage, ombre de la bande entière (un groupe : pas
  dans l'essai du 29/10), bas de polaroïd plus large.

## Les réglages (de départ, pris à l'œil sur la vitrine)
- `AVANCE_SIGNATURES` 0,1 et `MALUS_SIGNATURE_HORS` 2 (`editeur/outils.ts`) : devant les dessinés quand la signature convient, loin
  derrière sinon (une planche de neuf vignettes mal proportionnées coûte ≈ 1,6).
- `REGLAGES_GEANT` (`style.ts`) : `CORPS_MAX` 720 pt, plancher celui des titres (14 pt), pas d'un demi-point.
- `OMBRE_DOUCE` (`signatures.ts`) : opacité 0,35, flou 5 mm, décalage 0 / 2 mm ; `OMBRE_COUCHES` 12 (`pdf.ts`).
- `MARGE_TEXTE` 10 mm (`signatures.ts`) : tout texte des signatures à 10 mm des bords rognés et du pli (règle de la vitrine).

## Où
- `src/lib/mise-en-page/signatures.ts` : les onze gabarits, `convientSignature`, `fondPropose`, `OMBRE_DOUCE`, `MARGE_TEXTE`.
- `types.ts` : `origine: "signature"`, `Cadre.geant`, `Cadre.fait` (`SORTES_FAIT`), `Cadre.ombre`, `Template.fond`.
- `editeur/faits.ts` : `texteDeFait`, `periodeDe`, `FAITS_DE_PHOTO`. `editeur/lieuxTextes.ts` : les faits dans `lieuxParDefaut`, le
  géant dans `avecLieuxParDefaut` (`corpsAffiche`). `style.ts` : `corpsGeant` (et `ajusterTitre` refait sur `mesurerTitre`, à l'identique).
- `editeur/operations.ts` : `noterGabarit` (R183), `composer` → `avecFondPropose` (R182). `editeur/selecteurs.ts` : le corps géant et
  l'ombre à l'écran. `[id]/Scene.tsx` : l'ombre CSS. `idml.ts` : `ombreXml`. `pdf.ts` : `ombrePdf`.
- `sauvegarde.ts` : `geant`, `fait`, `ombre` admis sur un cadre retouché ou enregistré, relus exactement.

## Le test
`scripts/verif-mep-signatures.ts` (33 vérifications, lancé par `verif-atelier.ts`) : le catalogue (ids, doubles, sans aplat, marges),
les faits (formats, insécables, jamais inventés, l'heure de chaque vignette, l'export, et les 234 dispositions des gabarits d'avant qui
gardent EXACTEMENT leurs textes par défaut), le géant (le plus grand qui tient, une seule valeur écran / export / IDML / PDF, rien de
stocké), le fond proposé (posé, jamais par-dessus, Annuler, retiré il ne revient pas, miroir), le rang (convient, en tête, derrière sans
date, empreinte `0247b0a0` de sept lots), l'ombre (XML exact de l'essai, rien sans ombre, couches du PDF, écran), la sauvegarde.
L'empreinte des classements de doubles d'avant (`verif-mep-recette.ts`) se relève sans les signatures : tout le reste garde son ordre.

## La recette (16/11)
`design-explorations/editeur-lots-2026-11-16/recette/signatures/` : `index.html` (toutes les planches, l'avis signature par signature),
`comparaison-01.jpg` à `comparaison-11.jpg` (vitrine à gauche, éditeur à droite), `LISEZ-MOI.md`. Build de la branche servi sur 3093
sans base, création libre, les photos de la vitrine (copies du cache sous leur nom d'origine, date de prise en date de fichier), deux
premiers jets faits à la main (éditoriale sous T-01, audacieuse sous T-07, couleurs de la vitrine prises dans les photos) + la lecture IA
de Merisa, captures de la planche par Chrome sans fenêtre (repères d'atelier « dpi » masqués pour la capture, rien d'autre).

## L'essai Affinity (D28)
`scripts/idml-essai-signatures.ts <dossier de JPEG> <sortie>` : SG-09 (cinq tirages ombrés, contour et rotation), SG-01 (le géant) et
SG-03 (les heures), sous style et sans style, plus `attendu.json`. FAIT le 16/11 par le chef de projet, avec l'accord de Mathias, sur le
Bureau (`test-idml/signatures`) : FIDÈLE, ombres, rotations, contours et corps géants relus aux valeurs attendues (DECISIONS.md, D28).

## Historique
- 16/11 : onze signatures, quatre briques, recette « vitrine | éditeur » (branche `feat/mise-en-page-signatures`).
- 16/11 soir : finitions vues à la recette d'ensemble (branche `fix/mise-en-page-finitions-signatures`) : le géant vide devient un repère « Mot géant » (R186) ; un texte ne se coupe plus à l'écran, et celui que son cadre ne tient pas est marqué et dit avant l'export (R187). Captures `design-explorations/editeur-lots-2026-11-16/recette/finitions/`.
