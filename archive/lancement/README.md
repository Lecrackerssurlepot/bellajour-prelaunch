# Archive — `/lancement`

Retirée de la ligne le **28/08/2026**, en même temps que la prévente. Redirection
**307 vers `/`** dans `next.config.ts`.

C'était une seconde page d'accueil, écrite avant la bascule du 24/08 et jamais
promue : `(atelier)/page.tsx` a gagné `/`, et ce fichier portait depuis une
consigne périmée qu'il signalait lui-même en tête (« retirer robots au moment de
la mise en ligne officielle » — la suivre aurait donné DEUX pages d'accueil
concurrentes, dont la fausse portait le positionnement d'avant, « album
d'exception » au lieu de « magazine »). Elle était en `noindex` et **liée de
nulle part** : la retirer ne casse aucun parcours.

Son propre commentaire disait déjà l'essentiel : *route conservée pour ses
composants, pas pour son URL.* C'est toujours vrai — d'où l'archive plutôt que
la suppression.

## Ce qui reste utile ici

Neuf composants sous le préfixe `lc-`, dupliqués depuis la prévente puis
retravaillés : `S1Hero`, `Reassurance`, `Galerie`, `Parcours`, `Avis`,
`Presentation`, `FAQ`, `Navbar`, `AnnouncementBar`. La **page produit** à
construire (celle qui recevra l'étagère, les trois temps et les paliers, cf.
CLAUDE.md) y trouvera de quoi commencer.

⚠️ `public/images/lancement/` n'est PAS une archive : la galerie de la homepage
actuelle (`(atelier)/components/Univers.tsx`) sert ces images. Le dossier de
`public/` reste en place et vivant, malgré son nom.

## Comment la faire revenir

Retirer l'entrée `/lancement` de `next.config.ts`, puis :

    git mv archive/lancement src/app/lancement

Ses deux imports sortants sont déjà écrits en alias (`@/app/sections/Footer`,
`@/lib/pricing`) : valides ici comme là-bas, rien à retoucher.
