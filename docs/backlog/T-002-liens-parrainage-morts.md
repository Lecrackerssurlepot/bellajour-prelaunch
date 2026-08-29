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

## Ce qui a été fait
—
