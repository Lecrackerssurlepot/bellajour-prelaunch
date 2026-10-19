---
id: T-173
titre: La page Documents charge tout le tableau de bord pour afficher le nom des magazines
etat: nouveau
domaine: collectif
gravite: confort
autonomie: libre
ouvert: 2026-10-19
---
## Ce que Mathias a dit
« je veux aussi que tu enregistres dans tout cela les points qui concerneront euh, la
performance du site, la sécurité, donc voir toutes les failles, etc. » (19/10/2026)

## Ce que j'ai vérifié
- `src/app/edition/[token]/dossier/page.tsx:34` appelle `chargerTableau(e)` et n'en lit que
  `tableau.magazines` : 6 à 7 requêtes de trop, dont toutes les photos confirmées et les
  signatures de couvertures, de la mosaïque et des envois.

## Ce que je propose
Lire les seuls magazines de l'édition (une requête).

## Ce qui a été fait
Rien encore.
