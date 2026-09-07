---
id: T-100
titre: Les treize fondateurs ont un compte qui les attend, et personne ne le leur a dit
etat: nouveau
domaine: atelier
gravite: serieux
autonomie: avis-requis
ouvert: 2026-09-07
---

## Ce que Mathias a dit

« C'est Qu'il faut que l'on envoie un mail à tous les comptes fondateurs pour qu'ils puissent
du coup se connecter, que dans le mail, il y a un mot de passe temporaire et que quand ils
cliquent sur le lien ou quoi, ça leur demande de changer le mot de passe, ça peut être le plus
simple possible, voilà, et que du coup, c'est juste s'ils ne passent pas par ce mail et qu'ils
l'oublient, quand ils viennent mettre l'adresse mail ou quoi, ça leur dit, on vient de vous
envoyer un mail où vous pourrez changer votre mot de passe, voilà, mais ça, du coup, on envoie
le mail, et caetera, quand l'atelier est finalisé, comme ça, ils le reçoivent et ils peuvent
directement faire la demande s'ils en ont l'envie. »

## Ce que j'ai vérifié

(rien encore — le constat de départ, lui, est acquis : les 13 comptes ont été créés le 07/09
par `creer-comptes-fondateurs.ts --vraiment`, **sans qu'aucun mail ne parte**, conformément à
la décision du 04/09. Personne ne sait donc que son espace existe.)

## Ce que je propose

**Un mail C3 « votre espace vous attend », envoyé au moment où l'atelier est prêt.**

⚠️ **Sans mot de passe temporaire, et c'est plus simple ET plus sûr.** Un mot de passe en clair
reste dans une boîte mail pour toujours, se retrouve dans une recherche, s'oublie entre le
moment où on le lit et celui où on le tape. Le lien fait le même travail en un geste de moins :
il ouvre directement l'écran « choisissez votre mot de passe ». C'est la seule divergence avec
ce que Mathias a demandé, et elle sert exactement son « le plus simple possible ».

Ce que ça donne, marche par marche :
1. le mail C3 porte un lien frappé par `auth.admin.generateLink` (type `recovery`), qui mène à
   `/compte/reinitialiser?token_hash=…` — la page existe déjà et fonctionne ;
2. elle choisit son mot de passe, la session se ferme (invariant nº4), elle se connecte ;
3. ou elle ignore tout et entre par « Continuer avec Google », qui marche déjà.

**Le repli que Mathias décrit existe DÉJÀ et n'a rien à écrire** : si elle perd le mail, « mot
de passe oublié » lui répond « si un compte existe pour cette adresse, un mail vient de partir »
et lui renvoie un C2. La réponse est volontairement neutre (anti-énumération) : elle ne dit pas
« votre compte existe », elle dit « si ». C'est la formulation qu'il décrit, à un mot près, et
il ne faut pas la rendre affirmative.

Reste à faire :
- le texte de C3 dans le tableau `MAILS` de `scripts/mails-atelier.mjs` (règles de forme du
  script : pas de tiret cadratin, logo seul, vouvoiement, jamais « Cliquez ici ») ;
- `BREVO_TEMPLATE_C3_ID` sur Vercel après `--pousser --seulement C3` ;
- un script d'envoi borné à la liste des fondateurs, **dry-run par défaut**, qui journalise qui
  a reçu quoi — un envoi en masse sans trace est un envoi qu'on ne peut pas rattraper.

⚠️ **Treize vraies personnes, aux droits ouverts.** Aucun envoi sans accord explicite de
Mathias dans la conversation, et **jamais avant que l'atelier soit prêt** : les inviter à un
espace qui ne compose pas encore, c'est promettre deux fois.

⚠️ À vérifier au passage : le socle parle de **quatorze** fondateurs, la base en donne **treize**
(numéros 2 à 15, sans nº1 ni nº10). Si quelqu'un manque, cette invitation est le moment où ça
se verrait — et le pire moment pour s'en apercevoir.

## Ce qui a été fait

(rien)
