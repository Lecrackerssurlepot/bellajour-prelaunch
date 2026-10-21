# Le haut de la page Photos du téléphone, avant les planches 1 et 2 (21/10/2026)

Les fichiers tels qu'ils étaient sur `main` au 21/10/2026, juste avant la refonte « barre fine + filtres en bas » (planches
« téléphone » 1 et 2, validées par Mathias) :

- `Collecte.tsx`, `Listes.tsx`, `photos.css` : la page Photos du responsable ;
- `espace.css` : la coquille (la barre du haut de 62 px, le tiroir) ;
- `FinCollecte.tsx` : le « Déposer » flottant ÉTEINT d'une collecte terminée (`ec-ph-fab--eteint`).

## Ce que c'était (et qui n'existe plus)

- **Une barre du haut de 62 px** (padding 8 px, bouton menu de 44 px), qui GROSSISSAIT dans certains écrans tant que la coquille
  était une grille ; trois tailles de grand titre selon l'écran (40 px au tableau de bord, 30 sur Photos, 26 ailleurs) ; et
  `top: 78px` en dur pour coller la barre d'outils de Photos juste sous elle.
- **Une barre d'outils COLLÉE en haut de Photos** (`.ec-ph-moutils` : « Tout · Par lien », « Filtrer », « Cocher ») et, en mode
  « cocher », une barre collée « × · N cochées · Tout cocher » (`.ec-ph-barre-cocher`), plus la barre d'actions fixe en bas
  (`.ec-ph-bas`, quatre gestes).
- **Un bouton « Déposer » flottant** en bas à droite (`.ec-ph-fab`), qui laissait sa place à la pastille d'envoi.
- **Une feuille « Filtrer » PLEIN ÉCRAN** (de 52 px du haut au bas : 792 px sur 844), au voile flouté, avec les listes Lien,
  Personne (et sa recherche), Jour, Afficher (« Seulement les doublons », « Seulement ma sélection », « Ne pas publier »,
  « Corbeille »), Ordre (« Plus récentes » / « Par jour ») et un grand bouton « Voir N photos ».

## Par quoi c'est remplacé

- La barre du haut : **52 px en jeton** (`--ec-barre-h`, `--ec-barre-marge` dans `espace.css`), un seul grand titre de 34 px,
  qui passe dans la barre en défilant (`TitreEcran.tsx`, un `IntersectionObserver`). Le tiroir a son en-tête de 52 px et sa croix.
- Les filtres : une **barre flottante de verre en bas** (`.ec-fl` : Tout · Par lien · Personnes, et le bouton filtre rond), qui
  devient la barre d'actions en mode « cocher » ; « Cocher » est un texte sous le titre ; « Déposer » est un « + » rond dans
  l'en-tête.
- La feuille : **compacte** (`Feuille.tsx`), le Jour et Afficher seulement, au-dessus de la barre, sans flou.
- « Personnes » (le troisième choix) reprend le rôle de la liste Personne de l'ancienne feuille ; « Par lien » celui de la liste
  Lien. L'ordre « Plus récentes / Par jour » est devenu un lien dans le titre de la section « Jour ».

## Ce qui n'est PAS archivé, et reste en service

Toutes les routes (`/api/collectif/photos`, `etat`, `marquer`, `corbeille`, `personnes`), les gestes (agrandir, l'étoile, la
case, « Annuler » après une suppression), les règles d'accès, la page de l'ordinateur (la colonne « Trier et filtrer », `Listes.tsx`
en variante colonne), `.ec-ph-bas` et `.ec-ph-bas-actions` (encore lus par la corbeille et la photo agrandie).

Hors du périmètre du build (aucun import, `archive` est exclu de tsconfig et du lint).
