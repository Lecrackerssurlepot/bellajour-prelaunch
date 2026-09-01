# La relève quotidienne

`vercel.json` déclare une tâche planifiée : **tous les jours à 7 h UTC**
(9 h à Paris en été), Vercel appelle `/api/atelier/mails/relever`.

## Pourquoi elle est indispensable

**Six** choses n'existent QUE par elle — recomptées dans `codesPour`
(`src/lib/atelier/mails.ts`) le 01/09/2026. Ce document en annonçait quatre : il
oubliait M2b depuis sa création, et M10 s'est ajouté depuis.

| | Ce qui ne partirait jamais sans le cron |
|---|---|
| **M2** | « Il manque les photos », passé 12 h sur un questionnaire sans dépôt |
| **M2b** | Le dépôt resté en plan : elle a monté cinquante-cinq photos et n'a jamais cliqué « Envoyer ». M2 lui dirait qu'on les a perdues ; M2b dit l'inverse. |
| **M3b** | La relance à J+3 — *« le mail qui rapporte le plus de tout le système »* (PRD §10) |
| **M8** | « Le prochain moment ? », à J+3 après livraison |
| **M10** | Le préavis de fermeture à J-83 (T-076). ⚠️ **Toute la rétention à 90 jours en dépend** : `scripts/anonymiser-dossiers.ts` refuse de refermer un dossier dont le préavis n'est pas parti depuis 7 jours. Pas de cron ⇒ pas de M10 ⇒ **rien ne s'anonymise jamais**. |
| **Auto-validation J+7** | Sans elle, « une part des dossiers payés dort indéfiniment et la production ne se ferme jamais » (PRD §11) |

Les autres mails (M0, M1, M3, M4, M5, M6, M7, M9) partent au moment du geste —
M0 à la création du dossier, M4 au webhook Stripe, les autres depuis `/admin`.
Pour eux, la relève n'est qu'un filet : le jour où Brevo tousse, c'est elle qui
rattrape. ⚠️ Deux exceptions à ce filet, volontaires : **M4** n'est jamais
rattrapé (il enverrait « paiement reçu » avec des jours de retard aux dossiers
passés en payée à la main), et le rattrapage de **M0** s'arrête net au seuil de
M2 (au-delà, M2 dit la même chose en mieux).

## ✅ ARMÉE — prouvé le 29/08/2026

`CRON_SECRET` est posé en production. La preuve n'est pas un réglage vu dans une
interface, c'est un mail : **M2 est parti tout seul à 07:20:12 UTC** sur le dossier
resté vide du 27/08. Si le secret avait manqué, la route aurait répondu 404 et ce
mail n'existerait pas.

⚠️ Vercel déclenche **dans l'heure qui suit** l'horaire déclaré, pas à la minute :
7 h 20 pour un cron à 7 h est normal, ce n'est pas un retard.

La procédure ci-dessous est conservée pour le jour d'une rotation de secret ou d'un
nouveau projet.

## Comment on l'arme (référence)

La route refuse tout appel non signé. Vercel signe ses tâches planifiées
**uniquement si `CRON_SECRET` existe** dans les variables d'environnement.

1. Vercel → Settings → Environment Variables → ajouter `CRON_SECRET`
   (n'importe quelle valeur longue et aléatoire ; l'interface propose d'en
   générer une), sur **Production**.
2. Redéployer.

Tant que `CRON_SECRET` n'est pas posé, la tâche s'exécute et reçoit un **404** :
l'échec est visible dans l'onglet Cron Jobs de Vercel, et la page
`/admin/atelier/sante` finit par signaler « aucun mail parti depuis
longtemps ». C'est bruyant à dessein — un cron qui échoue en silence est pire
qu'un cron absent.

`ATELIER_MAILS_SECRET` reste accepté pour un appel à la main :

```bash
curl -s -X POST https://www.bellajour.fr/api/atelier/mails/relever \
  -H "x-atelier-secret: $ATELIER_MAILS_SECRET" | jq
```

## Fréquence

Une fois par jour suffit : les quatre déclencheurs ci-dessus se comptent en
jours, pas en heures. Le plan Hobby de Vercel ne permet de toute façon qu'une
exécution quotidienne.
