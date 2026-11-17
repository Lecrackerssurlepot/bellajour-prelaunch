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
  tirages à l'écran, dans le PDF et dans l'IDML (R184, essai Affinity FIDÈLE le 16/11 : `scripts/idml-essai-signatures.ts`, D28).
- Recette : `design-explorations/editeur-lots-2026-11-16/recette/signatures/index.html`, onze planches « vitrine | éditeur » et l'avis
  franc sur ce qui reste en dessous (typographie d'une seule paire, alignements sur l'horizon, photos en 1 500 px, manuscrit, N&B).
- Harnais : 33 vérifications (`scripts/verif-mep-signatures.ts`).
- Pas fait : les couvertures signature (étape 5).

**Recette des trois lots ensemble (16/11, avant fusion)**, `design-explorations/editeur-lots-2026-11-16/recette/ensemble/` : palette à droite,
tiroir par types sans « Fond », signatures en tête du tiroir quand elles conviennent (SG-08, SG-05), fond proposé posé avec SG-08, faits
(date, heure) écrits seuls ; aucune erreur de page dans la console. Corrigé à la fusion : le tiroir dit le NOM d'une signature (« Les
tirages jetés »), plus son code. Reste à polir, vu à l'écran :
- le mot géant pas encore écrit affiche « TITRE » en très grand (repère d'écran, jamais imprimé, D2) : sur une photo sombre il est illisible ;
- une légende longue reportée d'un autre gabarit dans un petit cadre (4,5 mm sous la vignette de SG-08) est rognée ;
- SG-09 et SG-01 n'ont pas été revues dans l'ensemble (aucune double du premier jet de Merisa ne leur convient) : elles l'ont été seules,
  dans les comparaisons du lot.

**En production le 16/11 (#371).** Fusionné après la recette locale et la recette des trois lots ensemble
(`design-explorations/editeur-lots-2026-11-16/recette/ensemble/`). Reste : l'essai à l'œil de Mathias sur les onze doubles signature, avant de fermer.

**Finitions du 16/11 au soir** (« Oui, corrige »), branche `fix/mise-en-page-finitions-signatures` :
- le mot géant vide ne s'affiche plus « TITRE » en 200 pt : contour en tirets et pastille « Mot géant », lisibles sur une photo sombre (R186) ;
- la légende rognée avait deux causes : le plancher d'écran de 9 px, plus haut qu'un cadre de 4,5 mm (une ligne coupée au milieu des
  lettres même pour « 16 h 58 »), et un texte long reporté dans ce petit cadre. Le plancher ne grossit plus un texte au-delà de son cadre ;
  un texte trop long n'est pas rapetissé (R-T-18 : la légende garde son corps) mais marqué en rouge, et la feuille d'export dit
  « Légende trop longue · planche n » (R187). Les cadres des signatures gardent leur taille (taillés pour leur fait).

**D30 validée par Mathias le 17/11** (« Je valide D30 ») : le goût passe par les doubles signature, leurs textes ne viennent que des
faits. Reste avant de fermer : son essai à l'œil des onze signatures et des finitions (#376), en production.
