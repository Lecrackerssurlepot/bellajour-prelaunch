---
id: T-132
titre: Le lieu sous le jour sur chaque vignette de la fiche
etat: en cours
domaine: admin
gravite: confort
autonomie: libre
ouvert: 2026-09-22
---
## Ce que Mathias a dit
En testant la fiche d'Eloise, après T-131 : « Quand il n'y a rien [d'enfoncé], juste les
images dans l'ordre d'upload et on voit la date et la loca, c'est tout. » Le rang de dépôt sur
la vignette (proposé) est refusé : la date et le lieu suffisent à comparer l'ordre du dépôt à
la chronologie.

## Ce que j'ai vérifié
Le voile en haut de la vignette (`ate-photo-jour`) ne portait que le jour (T-129). Le lieu
n'était visible qu'au survol (infobulle) et dans les titres de séjour en « Par lieu ».

## Ce que je propose
Le lieu sous le jour, dans le même voile : la ville, sinon le pays, en légèrement plus discret.
Une photo sans date mais avec un lieu porte le lieu seul ; sans rien, pas de voile. Deux lignes
au plus, chacune coupée par des points de suspension si elle déborde. Rien d'autre ne bouge.

## Ce qui a été fait
22/09/2026, branche `feat/lieu-sur-vignette`. **PR #212 fusionnée le 22/09, EN PROD** (déploiement READY du premier coup, alias bellajour.fr vérifié). `Fiche.tsx` (voile à deux lignes), `atelier.css`
(`.ate-photo-jour` en grille, `.ate-photo-lieu`), `admin/CLAUDE.md`. tsc, lint (0 erreur), build
verts, capture en démo.
