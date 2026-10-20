# La page Photos « en rayons » (15/10/2026 → 20/10/2026)

`Collecte.tsx` tel qu'il était au commit 54562a5 (main au 20/10, T-152, T-180, T-181) : les
grands chiffres, puis des RAYONS au-dessus des photos (Toutes les photos, Ma sélection, Vos
dossiers, Les participants, L'atelier), les dossiers et les liens en vignettes comme des
albums, un fil d'Ariane, les personnes d'un lien en pastilles qui défilaient de côté, et
« Toucher une photo l'ajoute à votre sélection ».

Remplacée le 20/10/2026 par la page des planches 1, 2 et 3 de
`docs/produit/collectif/maquettes/propositions-20-10/` (Audencia, huit bateaux) : une colonne de
LISTES qui trient et filtrent (Lien, Personne avec recherche, Jour, Afficher), « Tout » et « Par
lien », on COCHE des photos et une barre d'actions agit sur elles ; toucher une photo
l'AGRANDIT, l'étoile garde l'ajout à Ma sélection en un clic ; au téléphone, plus rien ne
défile de côté (une barre, une feuille « Filtrer », 4 colonnes, l'appui long pour cocher).

L'onglet « Les liens » n'a pas changé : il vit désormais dans
`src/app/edition/[token]/photos/Liens.tsx`, copié de ce fichier sans retouche.
Hors du périmètre du build (aucun import, `archive` est exclu de tsconfig et du lint) ; les
styles des rayons et des albums (`.ec-ph-rayons`, `.ec-ph-album*`…) restent dans `espace.css`.
