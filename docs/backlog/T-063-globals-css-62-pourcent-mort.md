---
id: T-063
titre: 62 % de la feuille servie sur tout le site vise des pages archivées
domaine: front
gravite: serieux
autonomie: libre
ouvert: 2026-08-29
---
## Ce que Mathias a dit
Rien — audit de performance du 29/08/2026.
## Ce que j'ai vérifié
`src/app/globals.css:82-253` — **6 388 des 10 332 octets (62 %)** ciblent des sélecteurs qui
n'existent plus dans `src/` : `#solution`, `.anx-scroll`, `.anx-sticky`, `.alb-scroll`,
`.alb-sticky`, `.sol-sticky`, `.reveal-up`, `.reveal-fade`, `.reveal-delay-1..4`, `.bj-section`,
`.hero-photo`, `.svt-right`, `.sol-upload-square`, `.alb-title-wrap`, `html.px-anchor` et un
sélecteur sur une image précise. Grep de contrôle : zéro occurrence dans `src/`, toutes dans
`archive/`.
Cette feuille est servie sur les 41 routes du site.
⚠️ **Deux de ces règles ne sont PAS inertes**, et c'est le vrai sujet :
- `:182` `section, div { max-width: 100vw }` s'applique à chaque `<div>` de l'accueil — 371
  éléments servis.
- `:183` `overflow-wrap: anywhere !important` a déjà dû être contré par un second `!important`
  (`ouverture.css:249-253`), et **coupe encore le mot géant de `/magazine`**, qui n'est pas protégé.
On débogue donc, et on contourne avec un `!important` de plus à chaque page neuve, une règle
écrite pour une page archivée.
## Ce que je propose
Retirer les sélecteurs prouvés morts (le grep est sans ambiguïté). Traiter les deux règles vivantes
séparément et avec soin : elles ont un effet réel aujourd'hui, et les retirer d'un bloc casserait
des contournements existants. Vérifier `/magazine` en 375 px avant et après.
## Ce qui a été fait
—
