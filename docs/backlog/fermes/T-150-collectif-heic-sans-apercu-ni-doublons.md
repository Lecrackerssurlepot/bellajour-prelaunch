---
id: T-150
titre: Les photos HEIC de l'Édition collective n'ont ni aperçu ni empreinte, les doublons ne les voient pas
etat: fermé
domaine: collectif
gravite: serieux
autonomie: libre
ouvert: 2026-10-14
---
## Ce que Mathias a dit (14/10/2026)
« J'ai pu uploader 770 photos, ça a bien fonctionné. Je me demande si le concept de doublon
fonctionne actuellement. »

## Ce que j'ai vérifié (14/10, en base, lecture seule)
Les 770 photos de « Essai révision (Claude) » sont arrivées et confirmées. Métadonnées lues sur
769, date sur 760, GPS sur 752, lieu sur 744, dimensions sur 769. MAIS :

| Format | Photos | Sans empreinte | Sans vignette |
|---|---|---|---|
| HEIC (iPhone) | 423 | 423 | 423 |
| JPEG | 343 | 1 | 0 |
| PNG | 4 | 0 | 0 |

- **55 % de l'envoi (les HEIC) n'a ni aperçu dans la grille ni empreinte** : le moteur d'envoi
  ne réduit pas un HEIC (`moteur.ts`, `reduire: !estHeic(...)`, Chrome ne sait pas le décoder) et
  le serveur ne sait pas le décoder non plus pour calculer l'empreinte et la luminance.
- **Les doublons ne sont donc cherchés que parmi les 347 JPEG et PNG.** La règle des doublons
  marche (empreinte perceptuelle, `doublons.ts`), elle est aveugle aux HEIC.
- Les 4 PNG font 1170 px de large : probablement des captures d'écran d'iPhone. La règle
  `estCaptureEcran` existe au B2C (`lib/atelier/metadonnees.ts`), pas encore au B2B.

## Ce que je propose
Décoder le HEIC au moment de l'envoi, dans le navigateur (un décodeur WebAssembly, chargé
seulement quand un HEIC arrive), pour produire la vignette ET une copie réduite qui donne
l'empreinte ; l'original HEIC part tel quel au coffre (rien n'est perdu pour l'impression).
À défaut, le même décodeur côté serveur dans l'enrichissement. À mesurer sur 400 HEIC réels
(temps, mémoire, iPhone) avant de choisir. Pas d'IA nécessaire pour ça.

## Décision de Mathias (15/10)
« Gérer les photos HEIC sans aperçu, c'est pas normal. » Le rattrapage des 423 HEIC déjà
envoyés sur « Essai révision » est accordé (écriture en base), une fois l'envoi corrigé.

## Ce qui a été fait (15/10/2026)
- **À l'envoi** : quand le navigateur ne lit pas le HEIC (Chrome, Firefox, Android ; Safari sait),
  le moteur des éditions confie la photo à libheif en WebAssembly (`public/heic/`, `libheif-js`
  1.19.8, LGPL, copie non modifiée et sa licence), chargé à la première photo seulement. Vignette
  de 320 px ; l'ORIGINAL part tel quel. L'empreinte et la luminance se calculent ensuite sur la
  vignette, comme pour un JPEG. Le moteur des particuliers n'est pas touché.
- **Prouvé** : deux HEIC envoyés depuis Chrome sans tête sur « Essai neuf (Claude) » ont vignette,
  empreinte, luminance, dimensions et date ; l'original garde sa taille exacte.
- **Rattrapage** (`scripts/collectif-heic-rattrapage.ts --vraiment`, accord de Mathias) : les 423
  HEIC d'« Essai révision (Claude) » ont leur vignette et leur empreinte, 0 échec, 0,9 s de
  décodage par photo (médiane), 10 min 30 en tout. Vérifié en base : 782 photos, 0 sans aperçu,
  1 sans empreinte (un JPEG d'avant). **Les doublons : 15 groupes, 20 copies (dont 14 groupes avec
  des HEIC)**, contre une seule copie avant.
- ⚠️ `is_primary()` n'existe pas dans ce libheif-js : on prend la plus grande image du fichier.

## Reste (hors de ce ticket)
- Les captures d'écran parmi les photos (`estCaptureEcran` du B2C, pas encore au B2B).
