# Noël 2026 : le dossier

Source de vérité de Noël B2C (cartes cadeau, 2ᵉ exemplaire, mails, réseaux). Branche `noel-2026`,
aperçu `/noel-preview` derrière `NEXT_PUBLIC_GIFT_CARD_ENABLED` (posé sur le Preview de la branche seulement).
Règle : une décision change ICI d'abord, puis la fiche Notion « Stratégie Noel ».

## Ce qu'il faut lire, dans cet ordre

| Fichier | Contenu | État |
|---|---|---|
| `DECISIONS-16-11.md` | les décisions de Mathias du 16/11 et l'état de chaque lot | **fait foi** |
| `STRATEGIE.md` | règles, offres, segments, calendrier, capacité, points ouverts | vivant, corrigé par DECISIONS |
| `MAILS.md` | la liste des 11 mails de Noël, leurs déclencheurs, les textes aux deux tons | textes **à réécrire** au nouveau ton (`docs/marque/TON.md`) |
| `COMMUNICATION-RESEAUX.md` | Instagram organique, accueil sur le site | vivant |
| `captures/` | captures 375 px et ordinateur des visuels v1 et v2 | historique visuel |
| `archive/` | ce qui a été remplacé, avec la raison (voir `archive/README.md`) | ne plus suivre |

La charte, le ton et la façon de présenter l'information ne vivent pas ici : `docs/marque/`.

## L'évolution

| Date | Ce qui s'est passé | Trace |
|---|---|---|
| 13/11 | Dossier stratégie écrit : règles, prix envisagés, parcours, mails, prévision de CA, plan réseaux, prompt et /loop. Page `/noel-preview` pour juger les visuels | a9e4800b, b771ffc6, ddc00c20 |
| 14/11 | Parcours v2 (carte sombre, bandeau, chapitre de l'accueil, `/offrir` en récit). Phrase retenue : « Vos photos deviennent un magazine. » | 52ad27ec, 3e48dc65, afe1903b |
| 16/11 matin | Décisions de Mathias : montants 30 / 50 / libre 20 à 200 €, vrais prix de `grille.ts`, 2ᵉ exemplaire −40 / −20 % pendant Noël seulement, reliquat sur le compte, SoBook par API, migration autorisée | f8e3b9c4 |
| 16/11 | Lot 1 (tables `cartes_cadeau`, `credits_mouvements`, migration appliquée en production) et lot 2 (acheter une carte, Stripe en mode test) | e2249960, 3a7ffce3 |
| 16/11 | Retouches de `/offrir` (moins de défilement, vraie signature sur la carte, dédicace au-dessus de la phrase, bandeau de jours, e-mail ET impression, carte bancaire seule) et lot 3 (la carte au paiement du magazine, le reste au compte, l'envoi programmé) | 0bbb0ca2 |
| 16/11 soir | Le bloc « payé » de `/numero` réécrit en récapitulatif ligne par ligne (retour de Mathias : « beaucoup plus structuré ») | 955e1e57 |
| 16/11 soir | Dossier rangé : documents remplacés en `archive/`, charte, ton et structure écrits dans `docs/marque/` | ce commit |

## Où on en est

- **Fait** (lots 1 à 3) : acheter, recevoir, imprimer, utiliser une carte ; le reste au compte, visible à `/numero` et `/compte`.
- **Validé à l'œil par Mathias le 16/11** : toutes les pages, sauf le bloc payé de `/numero`, refait le soir même.
- **À faire** : lot 4 (règle de Noël du 2ᵉ exemplaire, compteur de places), lot 5 (bandeau, chapitre, bloc `/magazine` sur le vrai site), lot 6 (SoBook, en attente de sa documentation et de sa clé).
- **Mails** : rien dans Brevo. Mathias envoie d'abord ses idées et ses retouches, on écrit le ton (`docs/marque/TON.md`), puis les textes, puis la programmation. Aucun gabarit, aucun envoi de test sans son accord.

## Constats du 13/11 encore vrais

- Le skill « bellajour-mail » (palette `#B8834A`, Playfair, « album », 1 page = 1 €) est PÉRIMÉ. Le gabarit Brevo 24 suit le dépôt (`#4A90D9`, cadre arrondi).
- `numeros.cloudprinter_order_id` et `docs/reference/SPECS-CLOUDPRINTER.md` : le code parle encore Cloudprinter ; SoBook est à brancher.
- Stripe test n'a **aucun webhook** : un paiement de test ne déclenche rien ; on rejoue l'événement signé en local.
- Brevo : plan gratuit, 300 envois par jour, à surveiller pour un envoi groupé. Les valeurs propres à un mail passent en paramètres transactionnels, sans créer d'attribut.
