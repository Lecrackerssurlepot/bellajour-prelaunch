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
