---
id: T-119
titre: La page de suivi du numéro fait fouillis (typos, espacements, boutons, trop d'informations), desktop et mobile
etat: fermé
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

### État couverture (18/09, PR #174)
Le bon de commande, la douane, la promesse, le bouton bleu et les deux accords entrent dans UNE
carte `.nu-commande` (760 px, centrée, étiquette « Votre commande »), même enveloppe que la carte
du document. Le bon perd ses filets haut et bas, le total passe à 28-32 px, le bouton s'aligne à
gauche dans la carte (pleine largeur sur mobile), « Ce n'est pas tout à fait ça ? » se centre
sous la carte. La logique du paiement ne bouge pas (deux temps, accords révélés au clic) ; la
visionneuse non plus, ses légendes se centraient déjà par leurs propres règles.
Vérifié en local sur le dossier réel « 24h des hautes alpes 2026 » : carte à 740 px sur l'axe
(1440), 343 px sur 390 sans débordement, bouton pleine largeur sur mobile.

### États en route et chez vous (18/09, PR #175)
En route : la carte du colis prend l'enveloppe commune (`.nu-carte`, 760 px) : transporteur et
numéro de suivi en deux champs à gauche, « Suivre le colis » en bouton verre à droite (dessous
sur mobile) ; le numéro reste écrit même quand le lien existe. Chez vous : une phrase (« Il existe
aussi en numérique, à garder et à partager »), le bouton, puis la relance centrée sur l'axe.
L'icône « s'ouvre ailleurs » passe dans `icones.tsx`, partagée avec la carte du document.
Aucun dossier réel à ces deux états : vérifiés en rendu statique (DOM final de la page réelle
+ balisage exact), desktop 1440 et mobile 390, captures dans la conversation du 18/09.

## Ce qui reste
Rien : Mathias a vu les six planches de captures le 18/09 (« c'est propre ») et a fermé le ticket.
Hors périmètre, à ouvrir à part si voulu : les deux accords visibles d'emblée dans la carte de
commande (la planche les montrait, le flux en deux temps est resté). Les blocs propres à en route (carte transporteur/suivi + bouton verre),
chez vous (relance centrée), attente. Puis vérifier la visionneuse au nouvel axe.
