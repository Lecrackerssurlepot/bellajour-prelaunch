---
id: T-150
titre: Les photos HEIC de l'Édition collective n'ont ni aperçu ni empreinte, les doublons ne les voient pas
etat: nouveau
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

## Ce qui a été fait
Rien encore. Ticket ouvert le 14/10/2026.
