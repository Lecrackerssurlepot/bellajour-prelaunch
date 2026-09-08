---
id: T-081
titre: Rien ne compare les paiements Stripe aux dossiers de la base
domaine: paiement
gravite: serieux
autonomie: avis-requis
ouvert: 2026-09-01
---
## Ce que Mathias a dit
Rien — reste détaché de T-035 le 01/09/2026, à sa clôture.
## Ce que j'ai vérifié
T-035 a couvert les trois points qu'on pouvait éprouver hors ligne (le tri du webhook, la grille
de prix, la zone de livraison), et il a confirmé que le filet de rejeu existe :
`src/lib/atelier/paiement.ts` rend `false` sur un échec d'écriture, `api/webhook/route.ts` rend
alors 500, Stripe rejoue, les handlers sont idempotents.
Ce que rien ne fait : **comparer les deux côtés**. Si Stripe encaisse et que la ligne ne passe
jamais en `payee` — les trois jours de rejeu épuisés, un point d'écoute qui pointait ailleurs
(le piège vécu le 24/08, `BASCULE-LANCEMENT.md` §1), une mitigation Vercel qui dure —
**personne ne le sait**. Il n'y a ni écran, ni requête, ni mail qui dise « une cliente a payé et
son dossier ne bouge pas ». `/admin/atelier/sante` ne regarde que notre base : un paiement
qu'elle ne connaît pas n'existe pas pour elle.
⚠️ C'est le seul défaut de la famille où **l'argent est déjà pris**. Tous les autres silences du
système coûtent une vente ; celui-ci coûte une cliente qui a payé et qui attend.
## Ce que je propose
Un balayage de réconciliation, à trancher sur trois points par Mathias :
1. **Le sens** : lister chez Stripe les sessions `complete` des N derniers jours, et vérifier
   que chaque `metadata.token` a un dossier en état ≥ `payee`. L'inverse (un dossier payé sans
   session) est moins urgent : il ne prive personne.
2. **Le lieu** : un script à la main (`scripts/`, dry-run par défaut, comme
   `anonymiser-dossiers.ts`) avant tout cron. Un cron qui appelle Stripe tous les jours sans
   qu'on ait jamais lu sa sortie est un bruit de plus.
3. **Le canal d'alerte** : c'est la décision de Mathias, et c'est aussi **T-031** (aucune
   remontée d'erreur en production). Tant qu'il n'existe pas, la sortie du script est la seule
   alerte, et il faut donc quelqu'un pour la lancer.
⚠️ Ne PAS écrire en base depuis ce balayage dans une première version : il constate, il ne
répare pas. Faire basculer un état d'après une lecture Stripe, c'est se donner le droit de
marquer « payée » une commande qu'on a mal lue.
## Ce qui a été fait (02/09)
**`scripts/reconcilier-stripe.ts`** — le balayage de réconciliation, **lecture seule**, exactement
comme cadré ci-dessus (aucune écriture, pas de `--vraiment` puisqu'il n'agit jamais).
- **Sens principal** Stripe → base : liste les sessions `complete` ET réglées (`paid` ou
  `no_payment_required` pour le cas fondatrice) estampillées `kind: atelier` sur N jours (défaut 30,
  `--jours=N`), et vérifie que chaque token a un dossier en état ∈ `ETATS_ENGAGES` (source unique,
  `retention.ts` — pas de liste redéclarée).
- **Sens léger** base → Stripe : un dossier « payée » sans aucun lien Stripe (ni session ni
  payment_intent) est signalé (anormal). Pas plus, pour éviter les faux positifs des paiements plus
  vieux que la fenêtre.
- **Garde `livemode`** comme le webhook : par défaut il ignore le mode test (`--avec-test` pour
  l'inclure). ⚠️ En local la clé est `sk_test` : pour rapprocher les VRAIS paiements (`sk_live`), le
  lancer là où la clé live est posée (Vercel), ou temporairement avec la clé live.
- `process.exitCode = 1` s'il trouve un écart (prêt pour un futur cron / T-031).
- Vérifié : `tsc` 0 erreur, `lint` propre. Premier run réel (`--avec-test`, données de test) : 2
  paiements, 1 rapproché, 1 écart correctement détecté (un `cs_test_` sans dossier — dossier de test
  nettoyé). Le détecteur fonctionne.

**Reste** : le lancer sur les vrais paiements (clé live), puis décider (T-031) d'un canal d'alerte
et éventuellement d'un cron une fois la sortie éprouvée sur plusieurs passages.

## Lancé sur la vraie base (08/09/2026)

Le reste de la fiche disait « le lancer sur la vraie base ». Fait, deux fois, en lecture seule
(le script n'a pas de `--vraiment` : il ne peut rien écrire).

**Passe 1, `--jours=90` (livemode seul, la vraie vie)** :
`0 paiement atelier réglé`, `0 écart`. Attendu — l'atelier n'a pas encore encaissé de vraie
cliente. Mais un silence sur zéro ligne ne prouve rien : il fallait vérifier qu'il sait DÉTECTER.

**Passe 2, `--jours=90 --avec-test`** : 3 paiements, 1 rapproché proprement, et **2 écarts
levés** :

- 10,00 € — `cs_test_a12VOwH7…NCNCV` — aucun dossier pour ce token ;
- 40,00 € — `cs_test_a1to9Qeg…ZaHf4cB` — aucun dossier pour ce token.

**Ce ne sont pas des bugs.** Ce sont les dossiers de recette supprimés en base après coup
(les « Test soir\* » et les tests du 03/09), dont la session Stripe de test, elle, est restée.
Le script fait exactement ce qu'on lui demande : il voit l'argent sans dossier. **Le filet
fonctionne, et c'est la première fois qu'on le prouve contre les deux vrais côtés.**

## Ce qui reste, et pourquoi je ne l'ai pas fait

Le cron. Il ne se pose pas tout seul : **Vercel Hobby n'autorise qu'une tâche planifiée par
jour**, et elle est déjà prise par la relève des mails de l'atelier. Trois issues, et c'est un
arbitrage, pas un geste technique :

1. **greffer le rapprochement sur la relève existante** (une seule tâche, deux travaux) — le
   plus économe, mais on mêle deux responsabilités et un échec de l'un peut masquer l'autre ;
2. **le passer sur GitHub Actions**, comme la relève horaire écrite pour T-097 — indépendant,
   gratuit, mais un secret de plus à poser ;
3. **le laisser à la main** et le lancer avant chaque clôture de semaine — suffisant tant que
   le volume est nul, insuffisant dès la première vraie cliente.

Ma recommandation : **(2)**, le jour où T-097 sera lancé — les deux tâches partagent le même
mécanisme, et le rapprochement ne doit pas dépendre de la santé de l'envoi de mails.

## État

`en cours` → le script est livré ET éprouvé contre la production. Reste le seul choix du
déclencheur, qui appartient à Mathias.
