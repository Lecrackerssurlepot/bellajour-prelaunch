# Écarts entre le site et le duplicata (26/11/2026)

Référence : « essai photo duplicata » (artefact 14BmVZ v4, sources
`design-explorations/refonte-2026-11-21/banc/pages/essai2/`). Comparaison en captures pleine page,
390 et 1440 px, duplicata à gauche et site à droite. Deux exceptions voulues : les chiffres restent
ceux du code, les textes légaux restent tels quels.

| Page | Écart constaté | Correction | Commit |
|---|---|---|---|
| /magazine | Espace énorme sous le menu : titre à 230 px (390) et 281 px (1440), contre 160 et 188 dans le duplicata. `main` ET la tête de page portaient chacun 120 / 96 px. | Seule la tête de page porte `--m-espace-tete-page`. Titre à 178 / 205 px. | 2c506b50 |
| /magazine | Le bloc de Noël vivait sur /magazine ; le duplicata le pose sur Offrir. | Retiré de /magazine, porté sur /offrir. | 2c506b50 |
| tout le site | Bandeau de Noël à 44 px en dur, contre `bandeau.hauteur` 40 / 36 px (les ~18 px qui restaient). | `--nl-bh` lit `--m-bandeau-hauteur`. | 6350583b |
| /offrir | Ancienne mise en page Noël (récit en colonne). | Structure du duplicata : tête, carte qui suit la saisie, bloc nuit de Noël, « La carte, en clair. ». Achat et Stripe inchangés. | f16527de |
| /partenaires | Brochure feuilletée (cinq images du PDF) au lieu de la page Groupes du duplicata. | Page Groupes portée : ouverture et pile, récit et derniers numéros, trois cas, quatre étapes, rendez-vous. | b3df3c02 |
| /partenaires | Dans le duplicata, « Week-end d'intégration » et les deux autres cas sont mal centrés sur mobile : texte en colonne étroite, doubles pages minuscules. | Sur ≤ 900 px : un cas par colonne, centré, doubles pages à 520 px max, usages en deux colonnes. | b3df3c02 |
| favicon | Carré noir derrière le b. | Le b seul par défaut ; carré blanc seulement pour l'écran d'accueil (iOS exige une icône opaque). | fd4796f3 |
| /ambassadeurs/** | Pages de l'ancienne charte encore en ligne. | Archivées, 307 vers l'accueil. | 57386818 |

| / (accueil) | Un chapitre de Noël (pile de couvertures, « le 2e magazine −40 % », scène épinglée de 2 500 à 2 700 px) après l'ouverture. Dans le duplicata, Noël n'est que le bandeau. La page faisait 14 753 px (390) et 14 707 px (1440), contre 12 144 et 11 977. | Chapitre retiré de l'accueil. Page à 12 221 et 12 007 px. Les épinglages étaient déjà identiques (ouverture 4 895 / 5 220 px, « Chaque moment » 4 558 / 3 870 px). | 26ffeaf8 |
| en-tête téléphone | Le compte passait avant le menu (`order: 2` sur le bouton menu). | Menu puis compte, comme le duplicata. | 26ffeaf8 |

## Vérifié sans écrire en base

- En-tête non connecté : « Mon compte », silhouette neutre.
- En-tête connecté (réponse de `/api/compte/statut` simulée dans la page) : initiale, « Suivre mon
  numéro » vers `/numero/<jeton>`, libellé « Mon compte, connecté ».
- Rendez-vous : « Prendre rendez-vous », « Voir les créneaux » et « Votre numéro » ouvrent le
  panneau ; aucune réservation. En local, sans agendas reliés, il affiche « Les créneaux ouvrent
  bientôt » et l'adresse de contact, comme avant.

## Ce qui reste

- **Titre de /magazine encore 10 à 13 px plus bas** que dans le duplicata (170 contre 160 au
  téléphone, 201 contre 188 à l'ordinateur), bandeau compris. L'écart vient des marges du titre et
  de l'étiquette, pas de l'espace de tête. Il était de 70 à 93 px avant correction.
- **Accueil** : 77 px de plus au téléphone et 30 à l'ordinateur. Cela vient du bandeau, qui pousse la page de 36 / 40 px alors qu'il recouvre la page dans le duplicata, et de 13 px de plus dans les blocs « Le premier numéro » et « Avant de commencer » (enfants identiques).
- **Pile d'ouverture Groupes** : le duplicata utilise deux couvertures en affiche de film
  (c-boys, c-nuit), écartées pour droits de tiers ; remplacées par Rio, Côte d'Azur, Sicile et
  Australie (emplacements `groupes.numero-*`, modifiables dans l'outil Visuels).
- **`groupes.entreprise`** : vide, d'où la case « Visuel à venir », comme dans le duplicata.
- **`BlocMagazine.tsx`** : plus utilisé depuis que Noël a quitté /magazine. Il reste en place pour le
  rangement de la phase 7.
- **`partenaires.css`** : les styles de l'ancienne brochure feuilletée ne servent plus. Ils restent
  pour la phase 7, avec les images `public/images/partenaires/brochure-ecoles-v1-*`.

## Vérifications du 26/11 (après les six commits)

- `npx tsc --noEmit && npm run lint && npm run build` : 0 erreur (25 avertissements de lint
  déjà présents), build vert.
- `verif-atelier` : TOUT PASSE (verif-noel y est appelé). `verif-media` : 138 vérifiés, 0 en échec.
- `brand/scripts/phase5/verifier.mjs` sur `next start` :
  - 31 pages, 0 réponse 5xx, redirections 8/8 ;
  - 144 rendus sans débordement ; motion réduite respectée ;
  - les avertissements CSP de WebKit étaient déjà là avant ces commits (48 à l'identique).
- Seul lien cassé : `/offrir` en 404. Le build local est fait sans le drapeau de la carte
  cadeau, qui se lit au build. Ce n'est pas le cas en préversion.
- axe : contrastes signalés sur `/partenaires` (34 à 39), du même type que ceux déjà relevés sur
  `/magazine` (31 à 34) : étiquettes et titres `.rv` saisis pendant leur apparition, sans doute.
  Ce n'est pas prouvé ; à reprendre en phase 5.
