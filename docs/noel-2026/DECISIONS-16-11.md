# Décisions de Mathias pour le développement de Noël (16/11/2026)

Prises dans la conversation du 16/11. Elles remplacent les hypothèses de TARIFICATION.md et de STRATEGIE.md.

| Sujet | Décision |
|---|---|
| Phrase de la carte | « Vos photos deviennent un magazine. » (14/11) |
| Montants de la carte | 30 € et 50 €, plus un montant libre de 20 à 200 € |
| Prix réels du magazine en France (grille.ts) | 24 p = 24 €, 36 p = 41 €, 48 p = 54 €, 60 p = 64 €, port de 5 € sous 50 € (les 25/35/45/55 € de TARIFICATION.md étaient faux) |
| 2ᵉ exemplaire | Règle de Noël (-40 % même couverture, -20 % autre couverture, 2 au plus, France seulement) **pendant Noël seulement**, puis retour automatique à l'ancienne règle (-30 % le 2ᵉ, -50 % du 3ᵉ au 10ᵉ, partout) |
| Reliquat d'une carte | **Sur le compte** (`/compte`) : la personne doit avoir un compte pour garder le reste |
| Facture d'une carte | Un reçu Stripe à l'achat, sans fatura. La fatura (brouillon InvoiceXpress relu par Louis) se fait à la commande du magazine, carte déduite (bon à usages multiples) |
| Migration en production | Autorisée pour les tables de Noël (cartes, mouvements de crédit), vérifiée en SQL |
| Compteur de places | Une place = un dossier **payé** depuis l'ouverture ; plafond 25 avant le 7 décembre |
| Imprimeur de Noël | **SoBook**, par son API (à brancher : documentation et clé à fournir par Mathias) |
| Bandeau | « Offrir une carte » mène à `/offrir` |
| Chapitre de l'accueil | Gardé tel quel pour l'instant (« pas festif, mais okay ») |
