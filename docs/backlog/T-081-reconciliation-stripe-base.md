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
## Ce qui a été fait
—
