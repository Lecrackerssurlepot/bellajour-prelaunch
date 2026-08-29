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
—
