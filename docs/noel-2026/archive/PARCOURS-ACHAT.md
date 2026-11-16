# Parcours d'achat — carte cadeau et 2ᵉ exemplaire

## Carte cadeau
1. Entrées : section « Offrir » sur `/` et `/magazine`, page `/offrir`. Un seul bouton par endroit.
2. `/offrir` : la carte (visuel animé), choix du montant, prénom de la personne, message court (140 car.), date d'envoi (aujourd'hui ou programmée, 8-24 déc.), e-mail du destinataire OU « je l'imprime moi-même ».
3. Paiement Stripe Checkout hébergé. Puis `/merci` : carte, code, bouton « Imprimer ».
4. Ajout à une commande de magazine : sur le récapitulatif, un bloc « Offrir aussi une carte ? » avec deux choix égaux : « Ajouter une carte » / « Non merci ». Refus = rien ne change, pas de relance. Une seule carte par ajout.
5. Utilisation : champ « Code cadeau » au panier ; montant déduit côté serveur ; si le total est 0 €, la commande se finalise sans Stripe ; si la carte dépasse la commande, le reliquat va au compte (crédit) ; si la commande dépasse, la différence passe par Stripe.
6. Compte cliente (`/compte`) : cartes achetées (statut : envoyée / utilisée / reliquat), crédit disponible.

## 2ᵉ exemplaire (France uniquement)
1. Au panier, si l'adresse de livraison est en France : « Un 2ᵉ exemplaire dans le même colis ».
2. Deux choix : « Même couverture : -40 % » ou « Autre couverture : -20 % ». Le second ouvre un sélecteur des autres couvertures (visuels « couverture 1 / 2 » depuis Canva). Pas de prix barré sur le 2ᵉ ; libellé « Pour un 1ᵉʳ exemplaire acheté, le 2ᵉ à -40 % ».
3. Maximum 2 exemplaires. Adresse unique. Hors France : le bloc n'apparaît pas, une ligne explique « Offre réservée aux livraisons en France ».
4. Rappel unique dans le mail de validation de l'épreuve (~J+5), fermé au lancement de l'impression. Le serveur recalcule tout : le navigateur n'est qu'un affichage.

## Wording (festif, partage) — 2 tons, dans la charte (vouvoiement, pas de « ! », pas d'emoji)
| Emplacement | Sobre | Plus décontracté |
|---|---|---|
| Titre section | Offrez un souvenir. | Et si le cadeau, c'était leurs photos ? |
| Accroche carte | Vos photos deviennent un magazine. | Vos photos deviennent un magazine. (retenue par Mathias le 14/11, en grand sur la carte) |
| Sous-titre | Une carte, un magazine composé avec leurs photos. | Vous offrez la carte, ils choisissent les photos. Nous composons. |
| Bouton | Offrir une carte | Offrir une carte |
| Après achat | Votre carte est prête. | C'est fait. Il ne reste qu'à la glisser sous le sapin. |
| Partage | Montrez-la à vos proches. | Faites-la circuler : une carte, c'est fait pour être montrée. |
| Compteur de places | Il reste N places avant le 7 décembre. | N places pour un magazine sous le sapin. |
Interdits : « simple », « exclusif », « incroyable », « révolutionnaire », tout tarif par page.
