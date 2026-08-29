---
id: T-060
titre: 164 Ko d'images du deuxième écran descendent pendant que le premier s'affiche
domaine: front
gravite: serieux
autonomie: libre
ouvert: 2026-08-29
ferme: 2026-08-29
---
## Ce que Mathias a dit
Rien — audit de performance du 29/08/2026.
## Ce que j'ai vérifié
`src/app/(atelier)/components/Univers.tsx:437,439,445,448` — quatre images de la page 02
(`solution-upload-02.webp` 36 Ko, `grid-03.webp` 68 Ko, `solution-upload-05.webp` 20 Ko,
`solution-upload-09.webp` 40 Ko = **164 Ko**) portent `fetchPriority="low"` mais **aucun
`loading="lazy"`**. Vérifié dans le HTML servi : elles sont dans le lot chargé avant
`window.load`.
Les dix images de la galerie (`:505-514`) ont bien leur `lazy` : c'est un oubli, pas un parti pris.
164 Ko, soit 56 % du poids image de l'accueil, descendent pendant que la couverture essaie encore
de s'afficher — pour un deuxième écran que la moitié des visiteuses ne verront jamais.
## Ce que je propose
`loading="lazy"` sur les quatre. Aucun effet visible : elles sont sous la ligne de flottaison.
## Ce qui a été fait
Fait le 29/08/2026. `loading="lazy"` posé sur les quatre images de la page 02
(`Univers.tsx:437,439,445,448`).
**Vérifié dans le HTML réellement servi** après reconstruction :
`solution-upload-02.webp … loading="lazy" fetchPriority="low" decoding="async"`.
164 Ko qui ne concurrencent plus l'affichage du premier écran. Aucun effet visuel : ces images
sont sous la ligne de flottaison, et le séquenceur ne les révèle qu'à la page 02.
