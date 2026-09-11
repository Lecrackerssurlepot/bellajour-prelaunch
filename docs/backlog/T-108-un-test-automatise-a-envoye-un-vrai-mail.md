---
id: T-108
titre: Un test automatisé a créé un vrai dossier et envoyé un vrai mail
domaine: atelier
gravite: serieux
autonomie: libre
ouvert: 2026-09-11
---
## Ce qui s'est passé
Le 11/09/2026 à 12:05, pendant la recette de la correction du questionnaire (PR #121), le script
de vérification d'un agent a cliqué le bouton final de l'écran 4 alors que la consigne l'inter-
disait explicitement. Conséquences réelles sur la base de production :
- un dossier créé, token `0BUuZ…`, titre « Nos trois jours » ;
- **un mail M0 réellement envoyé** à `mdurand085@gmail.com`.

L'adresse était celle de Mathias, jamais celle d'un client, et le dossier a été supprimé sur son
accord (`scripts/supprimer-dossiers.ts`). Le dégât est nul. Le défaut, lui, reste entier :
**rien dans le code n'empêche un test de déclencher un envoi réel.** La prochaine fois, l'adresse
du brouillon de test pourrait être celle d'une vraie cliente en cours de parcours.

## Ce que j'ai vérifié
`/api/atelier/numero` (POST) crée le dossier puis appelle `envoyerMailAtelier(supabase, "M0", …)`
sans condition d'environnement : la même route, le même code, la même base, que l'appel vienne
d'un navigateur humain ou d'un script. `.env.local` pointe la base de PRODUCTION (il n'existe pas
de base de préproduction : la preview Vercel partage la même, cf. la mémoire « base preview =
prod »). Le seul garde-fou existant est la consigne écrite dans le prompt de l'agent, et une
consigne n'est pas un verrou.

## Ce que je propose
Un interrupteur serveur, lu au même endroit que les autres secrets, qui coupe les ENVOIS sans
rien changer au reste du parcours :
- une variable `ATELIER_MAILS_COUPES` (absente en production, posée à `1` en local) ;
- lue dans `sendBrevoEmail` (`src/lib/brevo.ts`), le point de passage unique de tous les envois ;
- quand elle est posée : aucun appel à Brevo, un `console.warn` qui NOMME le mail et le
  destinataire, et le même retour `false` qu'un échec Brevo, pour que le verrou de
  `mails_envoyes` se retire comme aujourd'hui et que rien ne se croie envoyé.
- le harnais éprouve la règle pure (la décision de couper), pas l'appel réseau.

Effet de bord à assumer et à dire dans le code : en local, plus aucun mail ne part, donc la
recette d'un mail réel exige de retirer la variable sciemment. C'est exactement ce qu'on veut.

⚠️ Ne PAS coupler cet interrupteur à `NODE_ENV` : `next dev` tourne aussi quand on veut
délibérément éprouver un envoi, et un garde-fou qui se déclenche tout seul finit contourné.
