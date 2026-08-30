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
30/08 : la création du code est automatisée, le geste reste humain. Route POST
`/api/admin/atelier/fondatrice-code` (auth admin) : re-vérifie `waitlist`
(founder + confirmed + email canonique) côté serveur, crée le coupon Stripe (30 €, `once`)
et le promotion code `FONDATRICE-<nº>-<4 car.>` (`max_redemptions: 1`), journalise
`code_fondatrice_cree` dans `evenements` — qui sert aussi de verrou d'idempotence (un second
clic REND le code existant). Aucune migration, aucune colonne. La fiche admin affiche le code
en copiable avec sa date, ou le bouton « Créer le code de 30 € ». Le code ne part dans AUCUN
mail. Erreur Stripe = rien au journal ; clé absente = message clair.
RESTE À TRANCHER par Mathias : l'envoi à la cliente (automatique ou manuel) — l'UI le dit en
toutes lettres. NON TESTÉ contre l'API Stripe réelle : premier clic à faire par l'admin.
