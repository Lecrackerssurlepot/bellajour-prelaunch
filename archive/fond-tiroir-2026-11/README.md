# Le bouton « Fond » du tiroir des gabarits (archivé le 16/11/2026, T-209 second temps)

Le bouton « Fond » du tiroir (`Rangee`, `Gabarits.tsx`) ouvrait un sélecteur de couleur (`Nuances`) au-dessus du tiroir et posait
`colorerFond` sur la page ou la double. La **palette** à côté du magazine (`[id]/Palette.tsx`) le remplace : on glisse la couleur
sur la page, la pastille barrée retire le fond, la pipette et le choix libre y sont aussi.

`fond-tiroir-extrait.tsx.txt` garde les trois morceaux retirés : le bouton, le sélecteur (`.ed-fond-pop`) et le calcul `fondDe`.
Pour le remettre : recoller ces morceaux dans `Rangee`, réimporter `Nuances`, `hexDeCouleur` et `CouleurLibre`, rouvrir `.ed-fond-pop`
dans le test de fermeture de `EditeurMagazine.tsx`. Les gestes `colorerFond` et `colorerTexte` n'ont pas bougé. Le sélecteur
`Nuances` reste utilisé sous un texte qu'on écrit.
