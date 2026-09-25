---
id: T-136
titre: La cliente reçoit un numéro de suivi sans lien pour le suivre, et le nom du transporteur porte une coquille
etat: nouveau
domaine: atelier
gravite: serieux
autonomie: avis-requis
ouvert: 2026-09-25
---
## Ce que Mathias a dit

« oui, ouvre le ticket »

⚠️ **Le constat n'est pas de Mathias, il est de moi**, relevé le 24/09/2026 pendant le suivi de
la commande de Lara, en regardant ce qui était arrivé à Merisa la veille. Mathias l'a lu et a
demandé le ticket. Ce qu'il a dit de son côté, le 23/09, portait sur autre chose :
« Vérifie que l'impression du projet Lara sera parfait ! »

## Ce que j'ai vérifié

(vide — à remplir à la reprise du ticket)

Les éléments déjà relevés le 24/09, à re-prouver avant de toucher au code :

- Dossier de Merisa (`06f127eb-6196-48c5-8e28-1734f9b24024`, « Madeira 2026 »), **la première
  expédition réelle de Bellajour**. Journal du 23/09/2026 :
  `14:38:36` ItemProduced · `14:38:37` ItemPacked · `14:38:38` ItemShipped, état `en_production`
  → `expediee` · `14:38:39` mail M7 parti (gabarit 34). Quatre secondes en tout, sans intervention.
- En base : `transporteur` = « Correos Ecoonomy », `tracking_code` =
  « JVGL06383715000284254242 », **`tracking_url` = NULL**.

## Ce que je propose

Deux défauts, tous deux visibles par la cliente, tous deux corrigés par la même entrée dans la
même table. D'où un seul ticket.

1. **Aucun lien de suivi.** « Correos Ecoonomy » ne correspond à aucun motif de la table
   `TRANSPORTEURS` de `src/lib/atelier/suivi.ts` (chronopost, colissimo/la poste, mondial relay,
   dpd, gls, ups, dhl, fedex, bpost, colis prive, postnl, tnt). `lireSuivi` rend donc
   `url: null`.
   ⚠️ **Ce comportement est VOLONTAIRE et la règle est bonne** : le fichier dit « mieux vaut un
   numéro nu qu'un lien mort », et aucune adresse n'est jamais inventée. **Ne pas la casser.**
   Ce qu'il faut, c'est ajouter Correos à la table **avec une adresse de suivi VÉRIFIÉE**, pas
   devinée. En attendant, Merisa doit recopier 24 caractères dans un moteur de recherche.
   ⚠️ Le code commence par `JVGL`, ce qui ressemble à du GLS, mais **je n'ai rien vérifié** :
   router vers GLS sur cette seule ressemblance donnerait exactement le lien mort que la règle
   cherche à éviter. La vérification passe par un vrai suivi du colis de Merisa.

2. **La coquille.** Cloudprinter écrit « Correos Ecoo**n**omy », avec deux o. `nomTransporteur`
   ne connaît pas ce transporteur, retombe donc sur `capitaliser`, qui recopie la faute telle
   quelle. **Merisa a reçu un mail qui dit « Ecoonomy ».** Ajouter Correos à la table corrige les
   deux d'un coup, puisque c'est la table qui donne le nom propre.

3. **Vérifier le gabarit Brevo M7 quand `url` est nul** : le mail doit présenter le numéro et le
   nom du transporteur de façon autonome, sans bouton mort ni phrase qui promette un lien absent.
   C'est ce que Merisa a reçu, il faut donc le regarder tel qu'elle l'a vu avant de conclure.

`suivi.ts` est un module PUR : toute règle ajoutée s'ajoute aussi à `scripts/verif-atelier.ts`,
avec les deux cas réels (« Correos Ecoonomy » et un transporteur toujours inconnu, qui doit
continuer à rendre `url: null`).

**Pourquoi `avis-requis`** : le ticket change ce qu'une cliente lit dans un mail, et peut toucher
le gabarit M7. La règle de classement l'impose dès qu'un envoi de mail est concerné.

## Ce qui a été fait

(rien — ticket ouvert le 25/09/2026)
