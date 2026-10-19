---
id: T-170
titre: Le repérage des doublons devient très lent quand beaucoup de photos sont identiques, jusqu'à bloquer la grille
etat: nouveau
domaine: collectif
gravite: serieux
autonomie: libre
ouvert: 2026-10-19
---
## Ce que Mathias a dit
« je veux aussi que tu enregistres dans tout cela les points qui concerneront euh, la
performance du site, la sécurité, donc voir toutes les failles, etc. » (19/10/2026)

## Ce que j'ai vérifié
- `src/lib/collectif/doublons.ts:34-70` compare deux à deux les photos de même empreinte.
- MESURÉ par l'audit du 19/10 en exécutant le vrai module : 2 000 photos variées 4,6 ms ; 400
  empreintes identiques sur 2 000 photos 1 072 ms ; 1 000 identiques 16 229 ms, à CHAQUE page de
  la grille (`/api/collectif/photos`) et à chaque ouverture de la fiche atelier
  (`src/app/admin/collectif/donnees.ts:263`).
- Scénario : un lien de dépôt circule, quelqu'un dépose quelques centaines d'images presque
  identiques (rafale, captures, images noires) ; la grille du responsable et la fiche de
  l'atelier ralentissent jusqu'à l'erreur.

## Ce que je propose
Regrouper par empreinte exacte d'abord (une table de hachage, coût linéaire), et ne comparer deux
à deux que les quasi-doublons, avec un plafond. Le cas mesuré entre au harnais.

## Ce qui a été fait
Rien encore.
