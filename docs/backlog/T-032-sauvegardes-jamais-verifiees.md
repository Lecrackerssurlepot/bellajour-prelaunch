---
id: T-032
titre: On n'a jamais vérifié qu'une sauvegarde se restaure
domaine: donnees
gravite: serieux
autonomie: avis-requis
ouvert: 2026-08-29
---
## Ce que Mathias a dit
Rien — angle mort identifié le 29/08 en revue de préparation au lancement.
## Ce que j'ai vérifié
Deux dépôts portent des données irremplaçables : Supabase (les dossiers, les commandes, les
quatorze fondateurs) et R2 (les photos des clientes). Rien dans le dépôt ne documente une
sauvegarde, et surtout **aucune restauration n'a jamais été essayée**.
Une sauvegarde qu'on n'a pas restaurée une fois n'est pas une sauvegarde, c'est une intention.
Le cas qui fait mal n'est pas la panne du fournisseur : c'est un `UPDATE` sans `WHERE` lancé un
soir de fatigue.
## Ce que je propose
Trois questions à trancher, puis une page dans `docs/reference/` :
1. Supabase — quelle offre, quelle rétention de sauvegarde automatique, et jusqu'à quel point
   dans le passé peut-on revenir ?
2. R2 — les photos sont-elles versionnées, ou un effacement est-il définitif ? (Lié à T-023 : on
   veut y supprimer des orphelines.)
3. Une restauration d'essai, sur un projet de test, pour prouver que ça marche.
**Question pour Mathias** : quelle offre Supabase est active aujourd'hui ? Ça détermine tout.
## Ce qui a été fait
—
