---
id: T-002
titre: Les liens de parrainage des mails vivants sont morts
domaine: contenu
gravite: bloquant
autonomie: avis-requis
ouvert: 2026-08-29
---

## Ce que Mathias a dit
Rien — trouvé par l'audit de structure du 29/08/2026.

## Ce que j'ai vérifié
`src/app/api/waitlist/route.ts` lignes 41, 82 et 126 envoient, dans les mails **W1, P1 et P2
encore actifs**, un paramètre :

    REF_LINK: https://www.bellajour.fr/preventes?ref=<code>

Or `/preventes` est **retirée de la ligne depuis le 28/08/2026** (D13) : `next.config.ts:70`
pose une redirection 307 vers `/`. Et `/` ne lit **aucun** paramètre `?ref`.

Une marraine qui partage son lien envoie donc ses filleules sur l'accueil, où rien ne rattache
l'inscription à son code. Le parrainage est cassé pour tout mail parti depuis le 28/08, et pour
tous ceux déjà dans les boîtes avant.

## Ce que je propose
Deux choses, séparées :
1. **Corriger la destination** des trois mails vers une page qui lit `?ref`. `/inviter` existe et
   sert le parrainage — à confirmer que c'est la bonne cible, ou en désigner une autre.
2. **Décider du sort des liens déjà partis** : soit `/` apprend à lire `?ref` et à le poser en
   cookie avant de rendre l'accueil, ce qui rattrape l'existant ; soit on les laisse tomber.

**Question pour Mathias** : le parrainage de la prévente est-il encore actif maintenant que
l'Atelier a remplacé la landing ? Si oui, quelle est la page d'atterrissage, et veut-on rattraper
les liens déjà dans les boîtes ? Si non, les mails W1/P1/P2 doivent perdre leur bloc parrainage
plutôt que de promettre un lien qui ne marche pas.

## Ce que j'ai tenté le 29/08, et pourquoi j'ai tout annulé
Mathias a confirmé que le parrainage est toujours honoré. J'ai donc fait pointer les quatre
`REF_LINK` vers `/inviter?ref=`, et posé une redirection conditionnelle qui rattrapait tous les
liens déjà dans les boîtes (`/preventes?ref=X` → `/inviter?ref=X`, testée : 307 correcte).

**Puis j'ai regardé la page d'arrivée, et j'ai tout annulé.**
`/inviter` est la page de **la marraine** : « Prénom, partagez votre code avec vos proches ».
Ce n'est pas la page d'atterrissage d'une filleule. Y envoyer la personne qui reçoit le lien lui
montrerait le code de quelqu'un d'autre comme si c'était le sien.

**Vérifié, et c'est le vrai blocage :**
- **Aucune page n'accueille une filleule.** Zéro occurrence de « vous invite », « invitée par »,
  « parrainée » dans tout `src/app`.
- **L'Atelier n'a AUCUN mécanisme de parrainage.** Ni `referred_by`, ni `ref_code`, ni rien dans
  `src/lib/atelier/` : la table `numeros` ne porte aucun champ de rattachement.

Autrement dit : le programme est honoré, mais **la page où atterrit un lien partagé, et le tunnel
qui rattacherait la commande à la marraine, n'existent plus depuis l'archivage de la prévente.**
Réparer l'URL ne suffit pas — il faut décider ce qu'on montre à une filleule aujourd'hui, et
comment sa commande crédite sa marraine.

## Ce que je propose maintenant
**Question pour Mathias** : quand une filleule clique sur le lien de sa marraine aujourd'hui,
qu'est-ce qu'elle doit voir, et comment sa commande crédite-t-elle la marraine ?
Trois pistes, par coût croissant :
1. **Elle atterrit sur `/magazine?ref=…`**, le code est posé en cookie, et la création de dossier
   l'enregistre. Demande un champ de rattachement sur `numeros` — donc une migration.
2. **Une page d'invitation dédiée** qui dit « X vous offre des pages » puis renvoie vers
   `/magazine`. Même besoin de rattachement, plus une page à écrire.
3. **Le parrainage reste limité à la prévente**, honoré à la main pour les crédits déjà acquis,
   et le bloc parrainage disparaît de W1, P1 et P2.
Tant que ce n'est pas tranché, les liens restent cassés — mais au moins ils ne mènent pas au
mauvais endroit.

## Tranché le 31/08/2026 — EN PAUSE
Mathias : « On met en pause le lien de parrainage, on verra dans notre stratégie si on
l'active. » La stratégie complète (héritage, 4 décisions, déploiement en 3 étapes, questions
ouvertes) est consignée dans `docs/produit/STRATEGIE-PARRAINAGE.md`. Les liens déjà partis
mènent à l'accueil sans effet ; les droits acquis restent honorés à la main. Le ticket sort
du rang des bloquants : rien n'est promis publiquement tant que la pause tient.
