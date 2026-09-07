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
**07/09/2026 — re-vérifié : déjà fermé par un travail antérieur, rien à faire de plus.**

`src/app/globals.css` fait aujourd'hui **95 lignes / 5 211 octets** (contre 10 332 au
constat). Grep de contrôle sur tous les sélecteurs cités (`anx-scroll`, `anx-sticky`,
`alb-scroll`, `alb-sticky`, `sol-sticky`, `reveal-up`, `reveal-fade`, `reveal-delay-*`,
`bj-section`, `hero-photo`, `svt-right`, `sol-upload-square`, `alb-title-wrap`, `px-anchor`,
`#solution`) : **zéro occurrence dans `src/`**. Le fichier porte lui-même la trace du
ménage (commentaire ligne 80-85 : « RETIRÉS le 30/08/2026 (T-063) »), et le CSS retiré est
conservé dans `archive/landing-waitlist/globals-selecteurs-morts.css` (D-mémoire respectée).

Les deux règles « vivantes » ne sont plus un problème à traiter : elles sont maintenant
bornées à `@media (max-width: 767px)` (lignes 90-94), donc déjà à portée réduite, et
`/magazine` a bien son contre-ordre (`pdp.css:701-705`, `.at-pdp .mot { overflow-wrap:
normal !important }`) — vérifié par lecture directe, pas seulement par la fiche. Ce ne
sont plus des reliquats d'une page archivée : ce sont des filets anti-débordement
documentés (piège nº1, `src/app/CLAUDE.md`), actifs et nécessaires sur les pages
VIVANTES. Le titre du ticket (« vise des pages archivées ») ne s'applique donc plus à
rien de restant.

Aucune ligne de code changée pour ce ticket : le travail était déjà fait avant cette
séance. `npx tsc --noEmit`, `npm run lint`, `npm run build` verts (aucun changement sur
ce fichier de toute façon).
