# /compte : l'ancienne étagère et les cartes noires

Archivées le 26/11/2026, depuis `src/app/(atelier)/compte/`, au passage de l'espace personnel en
blanc (charte V2, fiche H « Bibliothèque », proposée à Mathias).

| Fichier | Ce que c'était |
|---|---|
| `CarteLivre.tsx.txt` | la carte d'un numéro livré, retirée de `Espace.tsx` (remplacée par `Etagere.tsx`) |
| `compte-cartes-etagere.css` | les anciennes lignes 257 à 546 de `compte.css` : cartes de dossier, étagère, palette nuit |

Plus aucun import ne les vise. Pour revenir en arrière : recoller `CarteLivre` dans `Espace.tsx`
et ces règles au bas de `compte.css`, puis retirer `bibliotheque.css`.
