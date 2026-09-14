---
id: T-112
titre: Les nouvelles demandes de la journée ne se lisent pas, et rien ne dit quand c'est à nous
domaine: admin
gravite: serieux
autonomie: libre
ouvert: 2026-09-11
ferme: 2026-09-11
etat: fermé
---
## Ce que Mathias a dit
« Au niveau de l'admin j'aimerais que l'on rende plus propre la compréhension des nouvelles
demandes de la journée et comprendre également quand est-ce que c'est à nous de faire.
Actuellement ce n'est vraiment pas clair ! » Avec la consigne de s'appuyer sur les meilleurs CRM.

## Ce que j'ai vérifié
Le défaut est réel, et il tient à trois choses, toutes dans le code :
1. **Trois définitions de « nouveau » cohabitaient** en tête de `/admin/atelier` (`Flux.tsx`) :
   « jamais ouvert » (par personne, table `dossiers_vus`, jamais pour un dossier sans photo),
   « arrivées aujourd'hui » (compté sur `created_at`, la date du QUESTIONNAIRE, pas celle du
   dépôt : `donnees.ts`, `mesurerFlux`) et « dépôt non terminé ». Quatre nombres, aucune liste.
2. **Rien sur la ligne ne disait qui doit jouer.** La colonne État affichait un nom passif
   (« Photos reçues », « Aperçu publié »). Le camp existait (`QUI_ATTEND`, urgence.ts) et le
   geste aussi (`SUITE`, parcours.ts), mais seule la fiche les lisait.
3. **Ce que le client avait fait depuis hier était invisible** : paiement, validation, retouches,
   ajustement changeaient un dossier de pile sans que personne ne le lise comme un événement.

## Ce qui a été tranché par Mathias (11/09)
- Une « nouvelle demande » = **photos envoyées** (`consent_photos`). Un questionnaire sans photos
  apparaît à part, en gris.
- Périmètre : la boîte du jour + la colonne « Prochaine étape » + deux camps. **Pas** la pile
  « Sans réponse » (T-110, point 2, reste ouvert ; `urgence.ts` n'a pas bougé).
- **Aucun bouton** dans la boîte du jour : on ouvre la fiche pour agir.

## Ce qui a été fait
Patrons repris des CRM : la boîte d'arrivée du jour (Front, Linear « Triage »), les deux camps
« waiting on you / waiting on customer » (Intercom), la colonne « next step » (Pipedrive, HubSpot).

- **`src/lib/atelier/arrivees.ts`** (pur) : ce qui est entré depuis hier 00:00 heure de Paris (le
  lundi, depuis vendredi), dérivé du journal `evenements`. Une ligne par dossier, l'événement le
  plus récent gagne, trois motifs (nouvelle demande, réponse du client, questionnaire sans
  photos). **La ligne disparaît d'elle-même** dès que la balle n'est plus chez nous.
- **`src/lib/atelier/prochaineEtape.ts`** (pur) : le camp et le geste, avec les MÊMES bascules
  qu'`urgencePour`. `parcours.ts` n'a plus sa table `SUITE` : la fiche et la liste lisent la même.
- **`Arrivees.tsx`** remplace `Flux.tsx` (archivé dans `archive/admin-flux-2026-09/` avec README).
  « Tout marquer vu » est dans la barre de filtres (`MarquerVu.tsx`).
- **`Liste.tsx`** : colonne « Prochaine étape » (pastille de camp + geste) à la place de « État »,
  liseré de ligne par camp, les retards et les à-faire lus sous un seul groupe « À nous », phrase
  du matin alignée (« 6 dossiers à nous, dont 3 en retard · 5 arrivés depuis hier »).
- **`donnees.ts`** : une seule requête journal pour le fil d'activité ET la boîte
  (`chargerJournalRecent`, plafond 200), toujours dans le `Promise.all` : aucune latence de plus.
- **Harnais** : 11 cas sur la prochaine étape, 4 sur la fenêtre (Paris, lundi, hiver), 12 sur la
  boîte. La démo (`/admin/atelier/demo`) passe par la vraie règle sur un journal fabriqué, et une
  graine à zéro photo qui passait pour un dépôt terminé a été corrigée au passage.

## Ce qui n'a pas été fait, volontairement
- La pile « Sans réponse » et la relance groupée : T-110.
- Une frise des arrivées (l'ancienne, sur 14 jours) aurait sa place sur `/admin/atelier/metriques`.
- Le choix de couverture n'entre pas dans la boîte : il se lit déjà en tag sur la ligne, et il
  précède le paiement, qui lui entre.
