---
id: T-214
titre: L'éditeur n'a pas de « goût » : Mathias adore les doubles faites à la main pour la vitrine Merisa et veut qu'un minimum de goût en vienne dans l'éditeur
etat: en cours
domaine: atelier
gravite: serieux
autonomie: libre
ouvert: 2026-11-16
---
## Ce que Mathias a dit
« En ce qui concerne ce que tu avais pu faire pour Audacieux ou l'autre pour Mérissa, j'adore les présentations que tu as pu faire, donc je trouve ça très intéressant qu'il y ait un minimum de goût qui puisse être développé. »

Retours du 16/11/2026, après la démo du premier jet et la vitrine Merisa. Mathias, sur l'ensemble : « Je te donne les détails qui pour moi sont des détails à modifier actuellement, mais bon, c'est pas encore très grave. » et « Après, tu vas aussi enregistrer ces modifications-là, on les mettra ou pas. Tu définiras quand. »

## Ce que j'ai vérifié
Le 16/11, sur main (048c10c9) :
- Aucun gabarit de l'éditeur ne reprend la vitrine du 14/11. Elle est faite à la main, en HTML, dans `design-explorations/vitrine-2026-11-14/`.
- Gestes qui manquent, relevés par les deux designers : photo à cheval sur le pli dans les générés, mot géant ajusté, tirage tourné avec ombre, bande de photomaton, détourage, titre posé sur l'horizon. Le fond libre existe depuis #364.
- Constat confirmé.

## Ce que je propose
Tirer de la vitrine du 14/11 (`design-explorations/vitrine-2026-11-14/`, directions éditoriale et audacieuse) des gabarits « signature » : chaque double devient un gabarit nommé, avec ses textes et ses couleurs. Lister les gestes qui manquent à l'éditeur pour les refaire (photo à cheval sur le pli, mot géant, tirage tourné, bande de photomaton, détourage) et les coder un à un, chacun vérifié dans Affinity (D28).

**Quand : vague 2, la prochaine grosse étape.** Mathias a dit qu'il adore les deux directions : on part des deux. Ordre : une double signature à la fois, d'abord celles qu'on sait déjà faire (pleine + mot géant, planche de vignettes égales, photo sur toute la double), puis les gestes nouveaux, chacun essayé dans Affinity (D28). Gros.

## Ce qui a été fait
16/11, vague 2, lot Signatures (branche `feat/mise-en-page-signatures`, poussée, pas de PR) :
- Inventaire des 6 doubles et 2 couvertures des deux directions : `docs/moteur/couches/C19-signatures.md`. 11 doubles sur 12 sont faites
  en signature ; « les plongeons traversent les lettres » attend le détourage, les deux couvertures attendent un fond libre de couverture
  (l'audacieuse, aussi l'horizon et le manuscrit).
- Onze signatures `SG-01` à `SG-11` (`src/lib/mise-en-page/signatures.ts`), `origine: "signature"`, devant les autres dessinés quand elles
  conviennent aux photos (R183).
- Quatre briques testées : textes tirés des faits (R180), géant ajusté à son cadre (R181), fond proposé à la pose (R182), ombre douce des
  tirages à l'écran, dans le PDF et dans l'IDML (R184, essai Affinity EN ATTENTE : `scripts/idml-essai-signatures.ts`).
- Recette : `design-explorations/editeur-lots-2026-11-16/recette/signatures/index.html`, onze planches « vitrine | éditeur » et l'avis
  franc sur ce qui reste en dessous (typographie d'une seule paire, alignements sur l'horizon, photos en 1 500 px, manuscrit, N&B).
- Harnais : 33 vérifications (`scripts/verif-mep-signatures.ts`).
- Pas fait : les couvertures signature (étape 5).
