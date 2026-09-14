---
id: T-113
titre: Archiver, récupérer et supprimer définitivement un dossier depuis l'admin
domaine: admin
gravite: serieux
autonomie: libre
ouvert: 2026-09-14
ferme: 2026-09-14
etat: fermé
---
## Ce que Mathias a dit
« Donne-moi la possibilité de pouvoir supprimer une demande. Ça m'évite de passer par toi lorsque
je fais des tests. Que je puisse supprimer le projet, qu'on puisse l'archiver en cas de problème,
qu'on puisse le récupérer, mais avec un supprimé définitivement également. »

## Ce que j'ai vérifié
Jusqu'ici, retirer un dossier passait par la ligne de commande (`scripts/supprimer-dossiers.ts`,
par adresse ; `scripts/recette.mjs nettoyer`, par titre et SANS toucher R2) ou par SQL. Aucune
colonne « archivé » n'existait ; seule `anonymise_le` (rétention T-076) mettait un dossier de côté,
et de façon irréversible. Les cinq tables liées cascadent bien sur `delete from numeros`
(vérifié le 10/09). T-033 demandait déjà une action « effacer ce dossier » depuis l'admin.

## Ce qui a été fait (14/09)
- **Migration `20260914_atelier_archive.sql`** : `numeros.archive_le timestamptz`, index partiel.
- **`lib/atelier/archive.ts`** (pur, prouvé par le harnais) : `verdictSuppression` (archivé
  d'abord ; jamais pendant `en_production` / `expediee` ; avertit si payé ou si une commande
  d'impression a existé) et `prefixeCoffre` (`numeros/<id>/`).
- **`lib/atelier/archivage.ts`** : `lireArchiveLe`, `lireIdsArchives` (tolérants à l'absence de
  la colonne).
- **Routes** : `POST /api/admin/atelier/archiver` (`{token, archiver}`), `POST
  /api/admin/atelier/supprimer` (`{token}` ; coffre R2 par préfixe AVANT la ligne, 502 si un objet
  résiste, rien retiré en base). La transition et la relance refusent un dossier archivé.
- **Écrans** : filtre « Archivés » dans la liste (les archivés n'apparaissent QUE là, ne comptent
  nulle part), « Récupérer » sur la ligne ; sur la fiche, un lien « Archiver ce dossier » armé en
  deux temps, puis un bandeau avec « Récupérer » et « Supprimer définitivement » (armé, rouge, liste
  ce qui part). Le panneau d'action disparaît quand le dossier est archivé.
- **Ailleurs** : la page `/numero/<token>` d'un dossier archivé répond 404, l'espace compte
  l'ignore, la page santé aussi, la relève quotidienne le saute.
- La démo porte un dossier archivé (« Test du 12 septembre »).

## Ce qui reste, et ne peut être que Mathias
1. ~~Appliquer la migration `20260914_atelier_archive.sql`~~ **Fait le 14/09/2026**, sur accord
   explicite de Mathias : colonne, index et cache PostgREST vérifiés, 6 dossiers en base, 0 archivé.
2. ~~Premier usage réel~~ **Fait le 14/09/2026 par Mathias** : archiver, récupérer, supprimer sur un
   dossier de test, « tout fonctionne parfaitement ». Ticket fermé.

## Ce qui n'est pas fait, volontairement
- Aucune annulation Stripe, aucun avoir InvoiceXpress, aucune annulation Cloudprinter : ce sont
  d'autres maisons, l'écran le dit avant le clic.
- Le crédit fondateur : supprimer le dossier d'un fondateur efface l'événement « crédit consommé »
  (cascade), et l'admin le redira « à imputer ». Le coupon Stripe (`max_redemptions: 1`) reste
  l'autorité : il ne se rejoue pas.
- T-033 (effacement RGPD) n'est pas fermé : l'effacement d'une cliente doit GARDER la facture, ce
  que la suppression définitive ne fait pas. Elle sert aux tests et aux erreurs, pas au RGPD.
