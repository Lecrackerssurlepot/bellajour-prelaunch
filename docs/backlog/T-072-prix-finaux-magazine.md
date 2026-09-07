---
id: T-072
titre: Les prix finaux du magazine ne sont pas tranchés
domaine: paiement
gravite: serieux
autonomie: avis-requis
ouvert: 2026-08-30
---
## Ce que Mathias a dit
« Stripe : mettre à jour les prix et connecter tout le système Stripe. »
## Ce que j'ai vérifié
La grille vit côté serveur, en dur et en un seul endroit : `src/lib/atelier/prix.ts:31-35` —
p30 = 30 €, p40 = 40 €, p45 = 45 € TTC, port compris (FR/BE/LU). Le checkout envoie ce montant
en `price_data` inline (`src/app/api/atelier/checkout/route.ts:204-206`) ; il n'y a aucun
Price ID Stripe (décision assumée). « Connecter le système » est donc déjà fait : changer les
prix = changer trois nombres dans `prix.ts`.
## Ce que je propose
Rien à coder d'avance. Le jour où Mathias donne la grille finale (un montant par palier),
la modification tient en une ligne par palier + recette du checkout. Interdit nº5 : aucun
montant ne sera posé sans sa décision.
**Question pour Mathias** : la grille finale — combien pour 20 pages, 40 pages, 48 pages ?
Et ces montants restent-ils TTC port compris ?
## Ce qui a été fait
**07/09/2026 — lot 5 « barème par tranches de pages » (PR draft `feat/bareme-pages`).**
La grille vit désormais dans UN fichier : `src/lib/atelier/grille.ts` (tranches de
pages, montants, bornes photos), importable navigateur et serveur. En dérivent :
`prix.ts` (prix ferme serveur, iso-comportement), `content.ts` → PALIERS (page
produit, pages désormais en tête de carte) et CTA_NOTE_PRICE (« dès 30 € » = min de
la grille), `composer/depot/paliers.ts` (libellés de l'écran 5), le JSON-LD
AggregateOffer de /magazine. Les montants 30/40/45 € sont les valeurs ACTUELLES,
gardées en placeholders — rien n'est inventé. La structure `shipping_options` Stripe
attend en commentaire dans `/api/atelier/checkout`. La PR ne merge pas sans les
décisions ci-dessous.
**Attend Mathias** : (1) les montants finaux par tranche (changer `grille.ts`, tout
suit) ; (2) le tarif de livraison désormais hors prix (activer `shipping_options` +
CGV selon `docs/produit/PROPOSITION-CGV-LIVRAISON.md`) ; (3) la borne 28/29 (T-006).
