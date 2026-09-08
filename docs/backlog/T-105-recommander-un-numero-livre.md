---
id: T-105
titre: Recommander un numéro déjà livré, depuis la bibliothèque
domaine: paiement
gravite: serieux
autonomie: avis-requis
ouvert: 2026-09-08
---

## Ce que Mathias a dit

08/09/2026 : « dans la bibliothèque, quand on clique sur un ancien magazine, à côté du bouton
télécharger le PDF, on puisse avoir recommander à nouveau, et qu'on ait tout le processus qui
soit prévu pour pouvoir recommander le même produit ».

Deux arbitrages rendus le même jour, à la question posée :

- **Le circuit** — *impression directe*. Paiement → commande Cloudprinter → suivi de colis,
  sans passage par l'atelier. C'est cohérent : le PDF a déjà été validé par la cliente et
  imprimé une fois.
- **Le prix** — *« j'attends pour trancher »*. Il veut y réfléchir : une réimpression ne coûte
  pas la même chose à produire qu'un premier numéro, l'atelier ne recompose rien. **C'est le
  verrou.** Interdit nº5 : aucun montant n'est inventé, pas même « le même qu'avant ».

## Ce qui a été fait le 08/09

La structure, verrouillée — même discipline que T-073, dont c'est le voisin direct.

- `src/lib/atelier/prix.ts` : `REIMPRESSION_CENTIMES = null` (le verrou), `centimesReimpression(palier)`
  et `reimpressionOuverte()`. Tant que la constante vaut `null`, la fonction rend `null` pour
  TOUT palier — jamais un prix de repli. Deux formes de levée sont documentées sur place :
  montant fixe, ou pourcentage du prix d'origine. Un seul endroit change.
- `src/lib/atelier/reimpression.ts` : le module PUR de décision. `peutRecommander({ etat, palier })`
  rend `{ possible: true, centimes }` ou `{ possible: false, refus }`, où `refus` vaut
  `pas_livree` · `palier_inconnu` · `prix_non_tranche`. L'ordre des contrôles est testé : un
  numéro encore en fabrication s'entend dire qu'il n'est pas livré, pas que le prix manque.
  Il porte aussi `CHEMIN_RECOMMANDER`, le nom de la route à écrire.
- `/compte/magazine/<token>` : le bouton « Recommander ce numéro — XX € », secondaire, **sur la
  même ligne** que « Télécharger le PDF ». Il lit le MÊME module que lira la route de paiement :
  impossible d'afficher un bouton qu'elle refuserait. Aujourd'hui il n'est jamais rendu.
- `scripts/verif-atelier.ts`, section « recommander un numéro (T-105) » : dix contrôles qui
  **gardent le verrou** — ils échouent le jour où quelqu'un ouvrirait la réimpression sans
  avoir posé de montant.

Vu à l'écran en levant le verrou en local (25 € factice), sur ordinateur et sur téléphone,
puis reverrouillé.

## Ce qui RESTE à construire

Délibérément non écrit : c'est la partie qui déplace de l'argent et lance de vraies
impressions, et elle n'est pas vérifiable tant que le prix n'existe pas.

1. **La route `/api/atelier/recommander`** (le nom est déjà dans `CHEMIN_RECOMMANDER`). Elle
   doit, DANS CET ORDRE : exiger une session compte, vérifier que le numéro appartient bien à
   ce compte (par `lireDossiersDuCompte`, jamais par le token seul — c'est la doctrine de
   `/compte/magazine`), appeler `peutRecommander`, **et vérifier en plus que
   `impression_fichiers` est présent** — condition de fabrication, volontairement absente du
   module pur (des clés R2 n'ont rien à faire sur le chemin de lecture de la cliente).
   Puis créer la session Stripe, avec l'adresse collectée par Stripe comme aujourd'hui.
2. **La branche webhook.** À la réussite du paiement : signer les fichiers d'impression du
   numéro d'origine et poser la commande Cloudprinter, sans transition d'état de l'original —
   il reste `livree`. Reste à décider où vit la trace de la deuxième commande : le dossier
   d'origine porte déjà un `order_id`. Une colonne, une ligne de journal, ou une table
   `reimpressions` — dans ce dernier cas c'est une migration, donc Mathias l'applique.
3. **Les mails.** Une réimpression n'a ni M0 ni couverture à valider. Il lui faut au minimum
   un accusé de commande et un mail d'expédition. À écrire dans `mails.ts`, à créer chez Brevo.
4. **L'admin.** Une réimpression doit se voir quelque part dans `/admin/atelier`, ne serait-ce
   que pour le chiffre d'affaires — le CA est aujourd'hui dérivé du palier des dossiers.

## Ce qui bloque, exactement

Mathias, le 08/09 au soir, après avoir vu la structure posée : **« le prix de réimpression, je
ne le connais pas »**.

C'est une précision qui change la nature du ticket, et il faut la garder. Ce n'est PAS un
arbitrage qu'il repousse — c'est une donnée qu'il n'a pas encore. Le ticket n'attend donc pas
qu'il se décide : il attend qu'on lui mette un coût sous les yeux.

**Ce qu'il faudrait établir pour le débloquer** (aucun de ces chiffres n'existe aujourd'hui
dans le dépôt, et aucun ne sera inventé — interdit nº5) :

1. Ce que Cloudprinter facture pour **un seul exemplaire** aux trois paliers de pages. La
   grille de production n'est nulle part dans le code : `impression.ts` ne porte que les
   références produit et les contraintes de fichiers, jamais les coûts.
2. Le **port** vers FR / BE / LU pour un exemplaire — le même arbitrage qui bloque déjà T-072
   et `PROPOSITION-CGV-LIVRAISON.md`. Les trois se répondent.
3. La marge qu'il veut sur une réimpression, sachant que l'atelier n'y passe **aucun temps** :
   le PDF existe, il a déjà été composé, validé et imprimé une fois.

Une fois ces trois nombres connus, le prix se pose et le verrou tombe en une ligne dans
`prix.ts`. Le reste de la liste ci-dessus s'écrit alors dans la foulée.

⚠️ **Ne pas rouvrir ce ticket en lui reposant la question telle quelle** — il y a déjà répondu :
il ne sait pas. Le rouvrir, c'est apporter les coûts, pas redemander le prix.

Voisin utile : **T-073** (plusieurs exemplaires à la commande, prix dégressifs) attend le même
genre d'arbitrage. Les deux se répondent — si un 2ᵉ exemplaire commandé le jour même a un prix,
une réimpression commandée six mois plus tard en a probablement un proche.
