---
id: T-191
titre: L'atelier ne peut demander au client que cinq contenus figés, sans choisir leur nom ni les fichiers acceptés
etat: nouveau
domaine: collectif
gravite: serieux
autonomie: avis-requis
ouvert: 2026-10-19
---
## Ce que Mathias a dit
« Et envoyer au client, ce serait bien de pouvoir ajouter euh, ce qu'on souhaite, avec euh, c'est
nous qui mettons le nom et euh, le type de fichier accepté ou pas, ou alors tout, euh, pour que
euh, s'il y a un contexte spécifique, que ce soit pas euh, genre... Le mot du dirigeant, alors ce
ne sera pas le dirigeant, ce sera le mot de je sais pas qui, tu vois. Euh, donc ça a un peu plus
de sens. » (19/10/2026, soir)

## Ce que j'ai vérifié (19/10)
- Cinq contenus figés (`CONTENUS`, `src/lib/collectif/types.ts:59-65` : logo, programme, mot du
  dirigeant, liste des participants, rubrique), cochés dans le formulaire.
- `collectif_editions.contenus_demandes` est un `jsonb` (il peut porter des demandes nommées
  sans migration), mais `collectif_contenus.type` a une contrainte `check (type in ('logo',
  'programme', 'mot', 'liste', 'rubrique'))` (`20261013_collectif.sql:256`) : un envoi sur une
  demande nouvelle serait REFUSÉ par la base. **Migration nécessaire**, appliquée par Mathias.
- La route `/api/collectif/contenus` refuse un contenu non demandé ; le « mot » est un
  questionnaire de quatre questions neutres (`QUESTIONS_MOT`) : renommer « Le mot du proviseur »
  ne change pas les questions.

## Ce que je propose
Planche 12 du canevas du 19/10 au soir (https://claude.ai/artifact/DK9igxYPaw7C4cJmtwbe6K) : une liste de DEMANDES, chacune avec son nom (écrit par
l'atelier), sa forme (un fichier : images, PDF, ou tout ; ou le questionnaire du « mot de… ») et
une poubelle ; « + Ajouter une demande » avec des modèles en un clic (Logo, Programme, Le mot
de…, Liste des participants, Autre). Le client voit les noms choisis dans « À envoyer ».
Migration : relâcher la contrainte de `collectif_contenus.type` (une clé de demande, texte libre
contrôlé par le code), lecture repliée tant qu'elle n'est pas appliquée.

## Ce qui a été fait
Rien encore (maquette seulement).
