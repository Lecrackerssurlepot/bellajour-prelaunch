# La visionneuse en carrousel de `/numero/[token]` (T-089, 02/09 → remplacée le 11/09/2026)

Archivé le 11/09/2026 depuis `src/app/numero/numero.css`, lignes 331 à 729 (bloc `.nu-viz*`
entier tel qu'il existait avant la refonte en planche). Copie verbatim dans
`nu-viz-carrousel.css` — aucune ligne perdue.

## Pourquoi il part

Mathias, capture à l'appui (11/09) : « l'affichage n'est pas au format ». La visionneuse montrait
UNE vue à la fois (flèches, points, glissé) — « Couverture 2 » d'une planche à plat s'affichait
entière en paysage dans un grand cadre, ce qui ne ressemble à rien qu'on imprime. Il veut une
PLANCHE : tout visible d'un coup, en grille façon Airbnb, chaque visuel à ses proportions réelles.

Remplacé par `.nu-pl-*` dans `numero.css`, consommé par `Apercu.tsx` (même composant, mêmes
props) et `construirePlanche()` (`src/lib/atelier/formatVisuel.ts`, remplace `construireVues`).

## Ce qui a SURVÉCU dans `numero.css` (pas dans cette archive, toujours vivant)

Trois familles de règles du bloc d'origine restent, car `Apercu.tsx` les réutilise telles
quelles sur la nouvelle grille :
- `.nu-viz-mag`, `.nu-viz-mag-face`, `.nu-viz-mag-pli` et leurs pseudo-éléments — l'objet
  magazine (épaisseur de papier, ombre portée), posé maintenant sur la tuile « première de
  couverture » et sur chaque tuile de double page.
- `.bj-atelier .nu-viz-choix-btn` (et `--doux`, les états `:disabled`) — les deux boutons de
  choix de couverture, inchangés dans leur texte et leur comportement.
- `.nu-viz-choix-refus` et `.nu-viz-note` — le message d'échec d'enregistrement et le mot
  rassurant « Ces pages restent entièrement modifiables… ».

## Ce qui est mort avec ce bloc

`.nu-viz` (conteneur), `.nu-viz-scene` + `--viz-h` (la scène à hauteur fixe), `.nu-viz-track`
(le glissé horizontal), `.nu-viz-slide`, `.nu-viz-page` et ses cadres `--droite`/`--gauche`/
`--large`/`--pleine`/`--pleine-dos`/`--ouverte` (les cadrages de vue unique), `.nu-viz-zoom`
(remplacé par `.nu-pl-zoom`), `.nu-viz-fleche` (et le repli tactile sans pastille),
`.nu-viz-bas`/`.nu-viz-nom`/`.nu-viz-points`/`.nu-viz-point` (la barre du bas à une seule
légende), `.nu-viz-choix` et `.nu-viz-choix-boutons` (l'empilement des deux boutons ensemble —
la grille les pose maintenant un par carte + un pour la section), `.nu-viz-nom-choix`
(remplacé par `.nu-pl-marque`), et la règle `prefers-reduced-motion` sur `.nu-viz-track`
(plus de transition à réduire, il n'y a plus de piste).

Deux dépendances externes à ce bloc ont dû être ajustées ailleurs au moment du retrait :
- `src/app/(atelier)/compte/compte.css` — `.cpt--mag .nu-viz-scene` réglait la hauteur de la
  scène sur `/compte/magazine` ; la planche n'a pas de scène à hauteur fixe, la règle est partie
  avec un mot daté à sa place.
- `src/app/numero/numero.css` (mobile, ~520px) — la même variable `--viz-h` y était resserrée ;
  partie pour la même raison.

`src/app/admin/atelier/atelier.css` cite `.nu-viz-page--droite/--gauche` dans UN COMMENTAIRE
(le ratio 210×297 redit pour l'admin) — ce n'est pas une dépendance CSS, la phrase reste vraie
et n'a pas été touchée.
