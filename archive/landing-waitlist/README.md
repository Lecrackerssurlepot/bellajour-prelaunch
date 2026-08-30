# Archive — l'ancienne landing de prévente

Ces fichiers **ne sont pas morts, ils sont rangés.** Ils composaient la landing
waitlist servie par `/` jusqu'à la bascule du 24/08/2026, où l'Atelier a pris
la racine. Depuis, plus rien ne les importe : ils ne partent dans aucun bundle,
ne peignent aucune page, et ne coûtent pas un octet à un visiteur.

Ils sont ici plutôt que supprimés parce qu'un fichier effacé ne se retrouve
qu'en connaissant son nom et la date de son commit. Ici, il s'ouvre.

## Pourquoi les avoir déplacés le 28/08/2026

Ils portaient **32 des 55 avertissements ESLint** du dépôt — dont la totalité
des `react-hooks/refs`, `exhaustive-deps` et `immutability`. Corriger des règles
de mémoïsation dans du code qu'aucun compilateur ne voit passer, c'était payer
un travail pour un gain nul. Sortis du périmètre (`eslint.config.mjs` →
`globalIgnores`, `tsconfig.json` → `exclude`), le lint ne parle plus que du code
qui tourne vraiment.

## Ce qu'il y a dedans

L'ordre historique de la page : `Hero` (crème) · `Anxiete` (sombre) ·
`BrandIntro` · `Solution` (avec ses trois visuels `CastingVisual`,
`SelectionVisual`, `MiseEnPageVisual`) · `Album` · `FinalWaitlist` · `FAQ`,
plus les deux éléments transversaux `StickyVText` et `StickyJoinCTA`.
Chaque composant importe sa propre feuille de style.

⚠️ `sections/Footer.tsx` n'est PAS ici : il est encore servi par sept pages.
Il a vocation à disparaître (D9), mais ce n'est pas fait.

⚠️ `Hero.tsx` et `hero.css` viennent de `src/app/`, pas de `sections/`.
Ne pas les confondre avec `ambassadeurs/Hero.tsx` + `ambassadeurs/hero.css`,
qui sont vivants et portent les mêmes noms. C'est cette confusion qui avait
coûté un préchargement de 283 Ko sur tout le site (voir CLAUDE.md).
`public/hero.css` est encore une troisième copie, servie à
`public/preview-anxiete.html` : elle reste en place.

## Comment les faire revenir

    git mv archive/landing-waitlist/Solution.tsx src/app/sections/Solution.tsx

Une seule chose à refaire à la main : `FinalWaitlist.tsx` importait
`../components/ReferralCard` et `../components/InstagramLink` en relatif. Les
deux chemins ont été réécrits en `@/app/components/…` pour rester valides depuis
l'archive — ils le restent depuis `src/app/sections/` aussi, il n'y a donc rien
à défaire.

Et attendre du travail : ces fichiers n'ont pas suivi les corrections de tokens
du 27/08 ni les règles React d'aujourd'hui.

## Le CSS global de ces sections (ajout du 30/08/2026)

`globals-selecteurs-morts.css` : les sélecteurs que `src/app/globals.css`
portait encore pour ces composants (bj-section, anx-*, alb-*, sol-sticky,
reveal-*, hero-photo, px-anchor, le cadrage de solution-casting-03, le bloc
« desktop fixes »), retirés le 30/08/2026 (T-063) après preuve par grep
qu'aucun fichier de `src/` ne les consommait plus. Si un composant ressort
de cette archive, son CSS global est là.
