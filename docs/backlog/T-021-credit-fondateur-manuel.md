---
id: T-021
titre: Le crédit fondateur de 30 € est entièrement manuel
domaine: paiement
gravite: serieux
autonomie: avis-requis
ouvert: 2026-08-29
---
## Ce que Mathias a dit
« L'admin affiche "30 € à imputer" (CGV art. 5 bis) mais il faut créer un code Stripe nominatif
à usage unique et l'envoyer à la main. Tenable à deux fondateurs, pas au-delà. »
## Ce que j'ai vérifié
Repris de `docs/ATELIER-A-FAIRE.md`. À confirmer dans le code avant d'agir.
Quatorze fondateurs ont des droits ouverts ; l'article 5 bis des CGV v3.0 engage l'imputation.
## Ce que je propose
Automatiser la création du code Stripe nominatif à usage unique au moment où l'admin le décide,
avec vérification préalable dans `waitlist` (comme l'exige l'article). Le geste reste déclenché
à la main : c'est de l'argent.
**Question pour Mathias** : combien de fondateurs ont déjà été servis à la main ? Le seuil qui
rend l'automatisation rentable, c'est le nombre restant.
## Ce qui a été fait
—
