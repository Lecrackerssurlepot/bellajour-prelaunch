# Le magazine agrafé de 20 pages, archivé le 16/09/2026

Décision de Mathias du 15/09/2026 : « L'agrafé disparaît, on est d'accord, il n'y a que le
dos collé qui reste. » La grille commence à 24 pages, dos carré collé.

Ce que portait l'agrafé, et qui vivait dans le code jusqu'au 16/09 :
- `AGRAFE.ts` : la table produit `magazine_sas_a4_p_fc` (saddle stitch), un seul PDF
  `product` (couverture intégrée), mêmes papiers que le dos carré ;
- sa règle de fichier : le PDF devait compter un multiple de 4 pages, 8 au minimum
  (`REGLE_PAGES_FICHIER`, impression.ts) ;
- `souvenir-route.ts` : la route du PDF souvenir telle qu'elle était, avec sa branche
  « agrafé » (un `product` rogné page à page, sans découpe de couverture) ;
- la valeur `"agrafe"` du type `Reliure` (grille.ts) et `PAGES_AGRAFE`.

Les specs Cloudprinter relevées (`docs/reference/SPECS-CLOUDPRINTER.md`) gardent la colonne
de l'agrafé pour mémoire. Le cadre de dépôt `pdf_produit` (`SLOTS_IMPRESSION`) reste
déclaré : un dossier antérieur peut encore porter un `product` dans `impression_fichiers`.

Hors périmètre de compilation. Rien n'importe ces fichiers.
