---
id: T-115
titre: Le cockpit de décision : quand faut-il avoir lancé le développement pour ne pas saturer l'atelier
etat: en cours
domaine: admin
gravite: serieux
autonomie: avis-requis
ouvert: 2026-09-17
---
## Ce que Mathias a dit
« Intégrer le cockpit de décision (prototype HTML fourni) à l'admin Bellajour. Objectif : le suivi
hebdo se remplit automatiquement, l'utilisateur ne saisit que les hypothèses (capacité, durée dev,
buffer, coût dev, % réinvesti). » Suivent les deux tables (`weekly_metrics`, `cockpit_settings`),
le job hebdo idempotent du lundi, les cinq formules (D_trigger, semaine de mur, date limite,
g froid lissé, capacité de financement), le verdict à quatre états, la fiabilité (socle froid
< 5/sem = non fiable), et les contraintes : jamais recalculer depuis les commandes brutes au
chargement, job relançable sans doublon, marge et pagination à surveiller ensemble, seuils =
repères et pas devis. Le chaud/froid était laissé « [PRÉCISER : UTM / code / bouton admin] ».

## Ce que j'ai vérifié
- **Le prototype HTML n'est ni dans le dépôt, ni sur le disque** (grep sur « cockpit »,
  « D_trigger », « semaine_de_mur », `mdfind`). L'écran est construit d'après les formules du
  brief, dans le style de `/admin/atelier/metriques`. À confronter au prototype si Mathias le
  retrouve.
- Aucune colonne d'origine, d'UTM ou de canal n'existe sur `numeros` ni dans le questionnaire :
  le chaud/froid ne pouvait venir d'aucune donnée existante.
- Aucun coût d'impression par commande n'est enregistré : le devis Cloudprinter journalisé par la
  transition ne porte que le port (`devis_ht_centimes`). **La marge mesurée est donc impossible
  sans inventer un coût** (interdit nº5) : `marge_moy` reste `null` et le cockpit retient
  `marge_defaut`, en le disant.
- Le jalon « payé » est déjà reconstruit par `mesure.ts` (`etat_change → payee`, écrit par le
  webhook Stripe) : le job s'appuie dessus, pas sur un compteur à côté.

## Ce que je propose
Fait sur `feat/cockpit-decision` (17/09) :
- Migration `20260917_cockpit.sql` : `weekly_metrics` (une ligne par semaine ISO, lundi 00:00
  Paris, avec `commandes_chaudes` et `commandes_sans_origine` en plus du brief, pour ne jamais
  compter l'inconnu comme froid), `cockpit_settings` (singleton, patron `admin_last_seen`, valeurs
  par défaut = points de départ des curseurs, `regle_le` null tant que rien n'est réglé), et
  `numeros.origine` (`chaud` | `froid` | null).
- **Chaud/froid tranché ainsi** : bouton sur la fiche admin (`Origine.tsx`, route
  `/api/admin/atelier/origine`) ; un dossier de fondateur est chaud d'office (journal :
  `credit_fondatrice_*`, `fondateur_rattache`) ; le reste sans origine est compté À PART et rend
  le socle non fiable. Pas d'UTM : rien ne les pose aujourd'hui, et un UTM absent ne dit rien.
- Job `src/lib/cockpit/job.ts` : réécrit TOUTES les semaines complètes (upsert sur `semaine`),
  donc idempotent et auto-correcteur quand une origine change. Cron Vercel du lundi 6 h UTC
  (`/api/atelier/cockpit/agreger`, secret d'en-tête comme la relève) + bouton « Recalculer ».
- Modèle pur `src/lib/cockpit/modele.ts` (formules du brief, verdict, fiabilité, constat
  marge/pagination), rejoué en direct par les curseurs ; 60 cas au harnais.
- Écran `/admin/atelier/cockpit` (+ `/admin/atelier/demo/cockpit` avec une série inventée).
- Seuils qui sont des réglages de code, pas des décisions : `SOCLE_FROID_MIN = 5` (brief),
  `FENETRE_PROCHE_SEMAINES = 4`, `LISSAGE_SEMAINES = 3` (brief).

**Ce qui attend Mathias** : (1) appliquer la migration `20260917_cockpit.sql` (l'écran le dit
tant qu'elle manque, aucune écriture ne se replie) ; (2) régler les hypothèses une première fois ;
(3) poser l'origine des dossiers déjà payés depuis leurs fiches, sinon ils restent « sans
origine » ; (4) me dire si les défauts des curseurs (10 / 8 / 2 / 10 000 € / 50 % / 20 € / 20)
doivent changer, ils ne viennent d'aucune donnée ; (5) retrouver le prototype pour comparer.

## Ce qui a été fait
17/09 : tout ce qui précède, sur la branche, vérifié par tsc, lint, build et harnais.
