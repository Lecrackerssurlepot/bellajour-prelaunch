---
id: T-061
titre: Le chemin de fer fait saccader le téléphone alors qu'il n'y est pas affiché
domaine: front
gravite: serieux
autonomie: libre
ouvert: 2026-08-29
---
## Ce que Mathias a dit
Rien — audit de performance du 29/08/2026.
## Ce que j'ai vérifié
`univers.css:640` pose `@media (max-width:1000px){ .at-accueil .pas{display:none} }`, mais
`Univers.tsx:314` ne teste que **l'existence du nœud**, pas sa visibilité.
Sur téléphone, chaque frame de défilement exécute donc : `hote.offsetTop` + `hote.offsetHeight`
(deux lectures forcées, `:316-317`), un `classList.toggle` (`:335`), une écriture de
`style.transform` (`:337`), puis `pages.forEach(el => el.getBoundingClientRect())` sur les
**sept** sections (`:339`) — sept recalculs synchrones APRÈS deux écritures de style — puis sept
`classList.toggle`. Soit **neuf lectures de géométrie forcées, soixante fois par seconde**, pour
un chemin de fer que l'iPhone n'affiche jamais.
S'y ajoute `verifierVisibles()` (`:304`), appelé avant le garde `y !== derniereY`, qui relit
jusqu'à sept rectangles de plus tant que les pages n'ont pas joué.
Le récit en sept écrans, là où passe tout le trafic Instagram, saccade au doigt sur le seul
appareil qui compte.
## Ce que je propose
Un test de visibilité réelle du rail (`matchMedia`, ou `offsetParent`), évalué une fois et
réévalué au redimensionnement, qui court-circuite tout ce bloc sur téléphone.
⚠️ Touche le séquenceur : à vérifier à l'œil sur les sept pages, en desktop ET en 375 px, avant
de conclure. Voir aussi T-062 (le calque de grain), qui se cumule.
## Ce qui a été fait
—
