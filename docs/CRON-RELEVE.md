# La relève quotidienne

`vercel.json` déclare une tâche planifiée : **tous les jours à 7 h UTC**
(9 h à Paris en été), Vercel appelle `/api/atelier/mails/relever`.

## Pourquoi elle est indispensable

Quatre choses n'existent QUE par elle :

| | Ce qui ne partirait jamais sans le cron |
|---|---|
| **M2** | « Il manque les photos », à J+1 d'un questionnaire sans dépôt |
| **M3b** | La relance à J+3 — *« le mail qui rapporte le plus de tout le système »* (PRD §10) |
| **M8** | « Le prochain moment ? », à J+3 après livraison |
| **Auto-validation J+7** | Sans elle, « une part des dossiers payés dort indéfiniment et la production ne se ferme jamais » (PRD §11) |

Les autres mails (M1, M3, M5, M6, M7, M9) partent au moment du geste, depuis
`/admin`. Pour eux, la relève n'est qu'un filet : le jour où Brevo tousse,
c'est elle qui rattrape.

## Ce qu'il reste à faire pour l'armer

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
