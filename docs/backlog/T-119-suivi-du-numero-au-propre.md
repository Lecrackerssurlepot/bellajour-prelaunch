---
id: T-119
titre: La page de suivi du numéro fait fouillis (typos, espacements, boutons, trop d'informations), desktop et mobile
etat: en cours
domaine: numero
gravite: serieux
autonomie: libre
ouvert: 2026-09-18
---
## Ce que Mathias a dit
« Sur les pages clients suivi du numéro : le UX ne me va pas du tout sur desktop et mobile. Il
fait fouillis au niveau des typos, les espacements, des boutons de partout et trop
d'informations. Mets tout cela au propre, reprends toutes les pages et fais-moi un artboard. »
Puis, la planche vue : « Ok pour l'axe centré, tu peux intégrer en commençant par la maquette. »

## Ce que j'ai vérifié (18/09, page de Merisa à l'état maquette, capture de Mathias)
Quatre niveaux de texte en concurrence avant le contenu (kicker « Maison d'édition du souvenir »,
titre, « C'est à vous. », « Madeira 2026, en entier. »), puis un corps, puis une note SANS aucune
règle CSS (`.nu-note` n'existait pas : 17 px hérités, collée au bouton), puis « Gardez ce lien »
dont les deux boutons de partage étaient DANS le paragraphe (`<LienPartage>` inline-flex dans le
`<p>`) : le texte coulait autour, d'où le chevauchement visible. Bandeau « Créez un compte » en
haut de page, liens PDF/Canva flottant entre la visionneuse et le bouton.

## La planche (validée par Mathias le 18/09)
https://claude.ai/code/artifact/482bab8a-76fd-4d8a-a37b-fa2a32e2ba64 — six états × desktop/mobile,
page système, variante texte à gauche (écartée : axe centré retenu). Source régénérable :
scratchpad `suivi/gen.py`.

## Ce qui a été fait (18/09, PR #173, branche `feat/numero-suivi-propre`)
La coquille commune à TOUS les états, et le bloc de l'état maquette :
- En-tête en grille 1fr · auto · 1fr : logo au centre quoi qu'il arrive ; « Mon compte » en verre.
- Le kicker disparaît ; l'étiquette « à qui est la balle » (11 px, point cuivre/gris) ouvre la
  colonne, au-dessus du titre. `MOT_DU_CAMP` devient trois mots : Entre nos mains / C'est à vous
  / En route / Chez vous. Affichée aussi à l'état couverture (elle ne double plus le titre).
- Gamme : titre clamp(44, 6vw, 64), mot clamp(26, 4vw, 30), corps 16/1,6, note 13, étiquette 11.
- Axe centré sur desktop (≥ 761 px), posé élément par élément (jamais hérité de `.nu-main` : hérité,
  il centrait la visionneuse et le bon de commande). Mobile : tout à gauche, CTA pleine largeur.
- `.nu-actions` : une rangée, un geste plein + un lien. `.nu-note` : enfin une règle.
- Pied « Gardez ce lien » : texte à gauche, boutons à droite sur une ligne (`.nu-garde-l`) ; la
  ligne « Créer un compte » y descend (`.nu-garde-compte`), le bandeau du haut est retiré.
- État maquette : PDF + liens dans UNE carte (`.nu-doc`, `.nu-doc-liens`, boutons `.nu-ghost`).
Vérifié en local sur les trois états réels en base (photos_recues, apercu_pret, validee) :
axe à 720 px, aucun débordement mobile, bon de commande toujours à gauche. L'état maquette n'a
AUCUN dossier réel en base ce jour : vérifié en injectant son balisage exact sur la page de
Merisa (desktop et 390 px), note à 13 px séparée du pied, CTA et lien centrés.
Textes changés (approuvés avec la planche) : « sans compte ni mot de passe » ; « Créer un compte
pour le retrouver sur tous vos appareils » ; les quatre mots de camp.

## Ce qui reste
Les blocs propres aux autres états, dans l'ordre de la planche : couverture (visionneuse +
bon de commande dans une carte, 760 px), en route (carte transporteur/suivi + bouton verre),
chez vous (relance centrée), attente. Puis vérifier la visionneuse au nouvel axe.
