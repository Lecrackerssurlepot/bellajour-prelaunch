# Liste des mails Noël — 2 tons

Charte mail (gabarit Brevo 24 + mails M0→M10 du repo, `src/lib/atelier/CLAUDE.md`) : tableaux HTML, 600 px, vouvoiement, sans « ! », sans emoji, Cormorant Garamond + DM Sans, accent #4A90D9. Brouillons Brevo seulement ; AUCUN envoi réel sans accord (CLAUDE.md interdit 2).
Signature DÉCIDÉE (13/11) : « L'atelier Bellajour » dans tous les mails Noël. La palette #B8834A est abandonnée : on suit la charte sombre du repo.

| Code | Mail | Déclencheur / date | Cible | Existant ou nouveau |
|---|---|---|---|---|
| N1 | Fondateurs n°1 : cartes et 2ᵉ exemplaire | lun. 16/11 | 14 fondateurs | nouveau |
| N2 | Fondateurs n°2 : dernier jour garanti lundi | ven. 4/12 | 14 fondateurs | nouveau |
| GC1 | Votre carte cadeau (acheteur) | achat | acheteur | nouveau |
| GC2 | X vous offre un magazine (destinataire) | achat ou date choisie | destinataire | nouveau |
| GC3 | Carte utilisée / reliquat crédité | utilisation | porteuse | nouveau |
| GC4 | Avis d'expiration de la carte | J-30 avant 12 mois (janv. 2027 pour les premières) | porteuse | nouveau, à valider |
| M4 | Confirmation de commande (mention 2 exemplaires, carte appliquée) | paiement | cliente | existant, à adapter |
| M5 | Validation d'épreuve + bloc « 2ᵉ exemplaire » (FR) | ~J+5 | cliente FR | existant, bloc ajouté |

## Liste complète au 16/11 (décisions de DECISIONS-16-11.md)
Aperçu de chacun, aux deux tons, sur `/noel-preview` partie 08 AVANT toute programmation Brevo. « Proposé » = texte écrit le 16/11, à relire.

| # | Code | Mail | Part quand | À qui | Statut |
|---|---|---|---|---|---|
| 1 | N1 | Fondateurs n°1 : la carte et le 2ᵉ exemplaire | à la main, sur ton accord | 14 fondateurs | texte de MAILS.md |
| 2 | N2 | Fondateurs n°2 : dernier jour lundi 7/12 | à la main, ven. 4/12 | 14 fondateurs | texte de MAILS.md |
| 3 | GC1 | Votre carte cadeau (reçu et code) | paiement de la carte, envoi immédiat ou impression | acheteur | texte de MAILS.md, reliquat corrigé (compte) |
| 4 | GC1b | Votre carte partira le JJ/MM | paiement d'une carte programmée | acheteur | proposé |
| 5 | GC2 | X vous offre un magazine | paiement, ou le matin du jour choisi | destinataire | texte de MAILS.md |
| 6 | GC2b | Y a reçu votre carte | départ d'une carte programmée | acheteur | proposé |
| 7 | GC3 | Votre carte a servi, il reste N € sur votre compte | commande payée avec la carte, s'il reste un solde | porteur | proposé (compte lié à l'adresse e-mail) |
| 8 | GC4 | Votre carte expire le JJ/MM | 30 jours avant les 12 mois, s'il reste un solde | porteur | proposé, texte légal à valider |
| 9 | GC5 | Votre carte est remboursée | remboursement Stripe de la carte | acheteur | proposé |
| 10 | M4 + bloc | Paiement reçu : exemplaires et carte appliquée | paiement du magazine (aussi à 0 € réglé par la carte) | client | M4 existant, bloc proposé |
| 11 | M5 + bloc | Maquette complète : « un 2ᵉ exemplaire » (France, pendant Noël) | publication de la maquette | client FR | M5 existant, bloc proposé |

Hors liste, déjà automatiques : le reçu Stripe de l'acheteur (si activé chez Stripe) et la fatura InvoiceXpress du magazine, que Louis finalise. Aucune fatura à l'achat de la carte (bon à usages multiples).
Un envoi programmé part avec la relève du matin (Vercel, 7 h UTC, « dans l'heure ») : « au matin », jamais à une heure précise.

Pas de mail à la waitlist non-acheteurs (opt-in non prouvé). Un mail max par 24 h par personne.

## Textes (80-200 mots, variables Brevo `{{ params.X }}` avec repli)
### N1 — objet : « Pour offrir, avant Noël » · preheader : « Une carte, et un deuxième exemplaire. »
**Sobre.** {{ params.PRENOM }}, vous faites partie des premiers à nous avoir confié vos photos. Merci. Pour Noël, deux nouveautés. La carte cadeau, valable douze mois, pour offrir un magazine composé avec les photos d'une autre personne. Et pour vous, un deuxième exemplaire dans le même colis : moins 40 % à couverture identique, moins 20 % avec une autre couverture, pour une livraison en France. Pour recevoir un magazine avant Noël, vos photos doivent nous parvenir avant le lundi 7 décembre. [Offrir une carte] — L'atelier Bellajour
**Décontracté.** {{ params.PRENOM }}, vous étiez là au début, alors voici nos nouveautés en premier. Une carte cadeau, pour offrir un magazine sans connaître la date de ses photos. Et un deuxième exemplaire à côté du premier, moins 40 % si c'est le même, moins 20 % s'il change de couverture, en France. Les photos pour Noël : avant le lundi 7 décembre. On vous attend à l'intérieur. — L'atelier Bellajour
### N2 — objet : « Dernier jour garanti : lundi » · preheader : « Le 7 décembre, nous fermons les dépôts. »
**Sobre.** {{ params.PRENOM }}, lundi 7 décembre est le dernier jour pour nous confier vos photos et recevoir votre magazine avant Noël. Il reste {{ params.PLACES }} places. Au-delà, la carte cadeau envoyée par e-mail reste disponible. **Décontracté.** {{ params.PRENOM }}, plus qu'un week-end. Lundi 7 décembre, on ferme les dépôts pour Noël : il reste {{ params.PLACES }} places. Après, la carte cadeau par e-mail prend le relais. — L'atelier Bellajour
### GC1 — objet : « Votre carte cadeau Bellajour » · preheader : « Le code est valable douze mois. »
**Sobre.** {{ params.PRENOM }}, votre carte de {{ params.MONTANT }} € est prête. Code : {{ params.CODE }}. Valable douze mois, utilisable en une fois ; si la commande coûte moins, le reste est crédité sur le compte. [Voir et imprimer la carte]. Pour une livraison avant Noël, les photos doivent arriver avant le 7 décembre. **Décontracté.** {{ params.PRENOM }}, c'est fait : une carte de {{ params.MONTANT }} € attend sous le sapin. Code {{ params.CODE }}, douze mois pour l'utiliser, le reste est gardé sur le compte. [Voir et imprimer la carte]
### GC2 — objet : « {{ params.PRENOM_DONATEUR }} vous offre un magazine Bellajour » · preheader : « Votre code est à l'intérieur. »
**Sobre.** {{ params.PRENOM }}, {{ params.PRENOM_DONATEUR }} vous offre un magazine composé avec vos photos. « {{ params.MESSAGE }} » Votre code : {{ params.CODE }}, valable douze mois. [Choisir mes photos] **Décontracté.** {{ params.PRENOM }}, {{ params.PRENOM_DONATEUR }} pense à vous : un magazine avec vos photos, à vous de choisir lesquelles. « {{ params.MESSAGE }} » Code {{ params.CODE }}. On vous attend à l'intérieur.
### GC3 / GC4 / blocs M4-M5 (sobre ; variante détendue = même structure, phrases plus courtes)
GC3 : « Votre carte a servi. Il reste {{ params.RELIQUAT }} € sur votre compte. » GC4 : « Votre carte expire le {{ params.DATE }}. Il reste {{ params.SOLDE }} € à utiliser. » (texte légal d'expiration à faire valider). Bloc M5 : « Pour un 1ᵉʳ exemplaire acheté, le 2ᵉ à -40 % (même couverture) ou -20 % (autre couverture), dans le même colis, jusqu'au lancement de l'impression. »
