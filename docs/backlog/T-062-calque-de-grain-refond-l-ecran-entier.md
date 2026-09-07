---
id: T-062
titre: Le grain refond l'écran entier à chaque frame de défilement
domaine: front
gravite: serieux
autonomie: libre
ouvert: 2026-08-29
---
## Ce que Mathias a dit
Rien — audit de performance du 29/08/2026.
## Ce que j'ai vérifié
`ouverture.css:26-31` — `.at-accueil .grain` est `position:fixed; inset:0; z-index:900` avec
`mix-blend-mode: soft-light`, monté sans condition par `(atelier)/page.tsx:124`.
Un calque plein écran en fusion non séparable oblige le compositeur à relire l'arrière-plan et à
refondre **le viewport entier à chaque frame**. Sur un iPhone en 390×844 à densité 3, c'est
1170×2532 pixels refondus, sur les ~5 900 px de défilement des sept pages.
Deux autres `mix-blend-mode` s'y ajoutent (`ouverture.css:78`, `univers.css:625`), et il n'existe
aucun `content-visibility` ni `contain` dans les 718 lignes d'`univers.css` ni les 372
d'`ouverture.css`.
S'y ajoutent deux boucles `requestAnimationFrame` permanentes (`Ouverture.tsx:109`,
`Univers.tsx:383`) qui **ne s'arrêtent jamais** quand leur composant est hors écran : coût de
batterie continu.
⚠️ Le grain est un choix esthétique assumé, et il a déjà remplacé des textures de 283 et 454 Ko.
Il ne s'agit pas de le retirer.
## Ce que je propose
Trois pistes à essayer dans l'ordre, en vérifiant le rendu à chaque fois :
1. Arrêter les deux boucles quand leur section est hors écran — gain net, aucun effet visuel.
2. `content-visibility: auto` sur les sept pages du récit.
3. Pour le grain seul : mesurer si une opacité simple donne un rendu acceptable sur téléphone, où
   la fusion coûte le plus. Si le rendu se dégrade, on garde la fusion : c'est la marque.
## Ce qui a été fait
**07/09/2026 — partiel, ré-audité avant correction.**

**Point 1 (les deux boucles rAF) était déjà réglé** : le commit `0a765a3`
(30/08/2026, perf du rail invisible/T-061) a posé un `IntersectionObserver` sur
`Ouverture.tsx` et `Univers.tsx` qui coupe la boucle (`cancelAnimationFrame`)
dès que sa section quitte l'écran, et la relance à l'entrée. Vérifié par
grep + lecture des deux fichiers : les lignes citées dans le constat
(`Ouverture.tsx:109`, `Univers.tsx:383`) ne sont plus des boucles permanentes.
Rien à refaire ici.

**Le calque de grain lui-même (`ouverture.css` `.at-accueil .grain`)** reste
un `position:fixed` plein écran en `mix-blend-mode:soft-light` : c'est le
coût réel qui demeure — le compositeur doit fondre ce calque avec tout ce
qui défile dessous, à chaque frame, tant qu'il est visible (propriété
intrinsèque du blend-mode sur un fixed superposé à du contenu qui défile,
pas un bug réparable sans changer l'effet).
Correctif au moindre coût, **zéro changement visuel** (vérifié : le calque
ne bouge jamais, `translateZ(0)` est une transformation identité) :
`transform:translateZ(0); will-change:transform;` ajoutés à `.grain`, pour
forcer le navigateur à garder ce calque sur sa propre texture GPU plutôt que
de le re-rastériser avec le reste de la page à chaque défilement — technique
connue pour ce couple `position:fixed` + `mix-blend-mode` sur Safari/iOS.

**Ce que je n'ai PAS fait, et pourquoi** :
- `content-visibility:auto` sur les sept pages (`univers.css`) : le
  séquenceur (`data-t`, `IntersectionObserver` à seuil 0.55, boucle rAF qui
  lit `getBoundingClientRect` pour le rail) est trop fragile pour ce risque
  sans pouvoir tester sur un vrai Safari iOS depuis cet environnement —
  documenté comme piste, pas fait.
- `isolation:isolate` sur `.at-accueil` (pour confiner le blend et éviter
  qu'il ne se recompose avec la Nav/le Footer, hors de `.at-accueil`) :
  aurait changé l'apparence de la Nav sous le grain (elle est actuellement
  DANS la zone de fusion, `z-index:50` contre `900` pour le grain) — rejeté,
  c'est exactement le changement d'aspect interdit par le ticket.
- Les deux autres `mix-blend-mode` (`ouverture.css:78`, `univers.css:625`)
  sont bornés à de petites boîtes de photo (`overflow:hidden`), pas au
  viewport entier : coût largement inférieur, non traités ici.

Vérifié : `npx tsc --noEmit`, `npm run lint`, `npm run build` verts ; `/` et
`/magazine` comparés à l'œil à 375×812 et desktop (captures), grain et
mouvement identiques ; `getComputedStyle('.grain').transform` confirmé
`matrix(1,0,0,1,0,0)` (aucun déplacement).
Non mesuré : le gain FPS réel sur un vrai iPhone (pas d'accès à un vrai
Safari iOS depuis cet environnement) — seule la mesure DOM/visuelle est
prouvée ici.
