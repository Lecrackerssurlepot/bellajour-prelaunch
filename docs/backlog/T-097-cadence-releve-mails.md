---
id: T-097
titre: Les mails à retardement partent jusqu'à 24 h après l'heure annoncée
domaine: atelier
gravite: serieux
autonomie: avis-requis
ouvert: 2026-09-04
---

## Ce que Mathias a dit (04/09)

« J'ai eu l'impression que des mails partaient en retard par rapport au moment d'envoi. »

## Ce qui a été vérifié (04/09, sur la base de production)

**Les mails immédiats ne sont pas en retard.** Mesuré sur les 27 derniers envois de
`mails_envoyes`, comparés à `created_at` / `etat_maj_le` du dossier :

| mail | déclencheur | écart réel |
|---|---|---|
| M0 | création du dossier | 0,5 s à 1,5 s |
| M1 | dépôt terminé | < 2 s |
| M3 | publication de l'aperçu | 0,6 s |
| M4 à M7b | webhook / transition admin | < 2 s |

Tous ces envois sont `await`és dans la route qui les déclenche : aucun n'est différé.

**Le retard est ailleurs, et il est structurel.** Tout ce qui ne peut partir QUE par le balayage
(`/api/atelier/mails/relever`) attend le cron de `vercel.json`, qui tourne **une fois par jour à
7 h UTC** — et le plan Hobby de Vercel le déclenche « dans l'heure qui suit », pas à l'heure
dite. Conséquence, par mail :

| mail | ce qu'on annonce | ce qui arrive vraiment |
|---|---|---|
| M2 / M2b | « J+1 » | 12 h à 31 h après l'inscription |
| M3b | « 3 jours après M3 » | 3 à 4 jours — c'est le mail qui vend |
| M8 | « J+3 après livraison » | 3 à 4 jours |
| M10 | préavis de fermeture | un jour de plus, sur 83 |
| auto-validation J+7 | la date écrite dans M5 | dépassée d'un jour une fois sur deux |

Le plan Hobby ne sait pas faire mieux qu'une tâche par jour.

## Ce qui a été fait (04/09)

- `.github/workflows/releve-mails.yml` — un appel horaire de 6 h à 20 h UTC (8 h à 22 h à Paris),
  qui ramène tous les retards ci-dessus sous l'heure. **Inerte tant que le secret n'est pas
  posé** : sans `ATELIER_MAILS_SECRET` dans les secrets du dépôt, le job s'arrête proprement et
  le dit. Le cron Vercel reste en place comme filet. Rien ne peut partir deux fois : le verrou
  est dans `mails_envoyes`.
- `export const maxDuration = 60` sur la route de relève : le balayage envoie en série et
  n'avait aucune borne déclarée, donc le plafond de 10 s du plan. Une coupure au milieu de la
  boucle est silencieuse (le résumé n'est journalisé qu'après).

## Ce qu'il faut trancher (Mathias)

**Armer ou non le workflow.** Poser `ATELIER_MAILS_SECRET` dans
`Settings → Secrets and variables → Actions` du dépôt fait passer les relèves de 1 à 15 par
jour, sur de vraies clientes. Rien d'autre à faire, aucun redéploiement.

Deux réglages possibles au moment de le décider :
- la plage horaire (6 h – 20 h UTC aujourd'hui) ;
- l'alternative payante : Vercel Pro autorise un cron horaire natif et rend ce workflow inutile.

## État

`en pause` — le code est posé et vérifié (tsc, lint, build, harnais). Il attend un geste de
Mathias sur GitHub, et ce geste change la cadence d'envoi vers de vraies clientes.
