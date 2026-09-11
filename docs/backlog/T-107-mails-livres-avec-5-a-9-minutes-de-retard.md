---
id: T-107
titre: Les mails mettent 5 à 9 minutes à arriver, alors que le site les soumet à la seconde
domaine: atelier
gravite: serieux
autonomie: avis-requis
ouvert: 2026-09-11
---
## Ce que Mathias a dit
« J'ai fait une demande avec mon adresse. J'ai l'impression que cela ne part jamais
instantanément. » Puis, devant les mesures : « Ah oui, c'est pas possible que cela soit aussi
long. » (11/09/2026, pendant son premier test complet du tunnel.)

## Ce que j'ai vérifié
Le site n'est PAS en cause. Sur son test du 11/09, la base montre le dossier créé à 12:19:19 UTC
et `mails_envoyes` porte M0 à 12:19:19 (la même seconde) et M1 à 12:20:07 (la seconde où le dépôt
s'est terminé). La garantie nº5 du parcours est tenue.

Le retard est ENTRE l'acceptation par Brevo et la remise. Relevé par l'API Brevo
(`/v3/smtp/statistics/events`, heures Paris) :

| Mail | `requests` | `delivered` | délai |
|---|---|---|---|
| M0 « Nos trois jours » (dossier de test) | 13:05:47 | 13:14:44 | **8 min 57 s** |
| M0 « Test vendredi 11/09 » | 13:19:20 | 13:24:56 | **5 min 36 s** |
| M1 « c'est parti » | 13:20:08 | 13:25:15 | **5 min 07 s** |

Trois causes écartées, chacune vérifiée :
- **quota** : compte à 297 crédits restants sur 300 par jour, donc loin de la limite ;
- **authentification du domaine** : `bellajour.fr` et `bellajour.com` sont `authenticated: true`
  et `verified: true` chez Brevo (SPF/DKIM en place depuis le 24/08) ;
- **rebond ou blocage** : aucun événement `hard_bounce`, `blocked` ou `spam` sur l'adresse.

Reste le plan : le compte Brevo est en **`type: free`**. L'explication la plus probable est la
file d'attente des comptes gratuits (les payants sont servis d'abord). **Non prouvé** : Brevo
n'expose pas sa file, et je n'ai pas de compte payant à comparer. Ce qui est prouvé, c'est le
délai, pas sa raison interne.

## Pourquoi ça compte
Trois moments du tunnel en souffrent, par ordre de gravité :
1. **M3**, qui porte le LIEN DE PAIEMENT. Le client vient de découvrir sa couverture sur sa page,
   il attend le mail, rien n'arrive pendant huit minutes.
2. **M0**, l'accusé du questionnaire, dont toute la raison d'être est de dire « il manque vos
   photos » TANT QUE C'EST FRAIS (garantie nº5, incident du 27/08).
3. **M1**, la confirmation du dépôt : sans elle, le client croit que l'envoi a échoué et
   recommence.

## Ce que je propose
Une seule décision, et elle est à Mathias parce qu'elle coûte de l'argent : **passer le compte
Brevo à un plan payant**. Aucun montant n'est écrit ici (interdit nº5) : relever la grille
tarifaire de Brevo au moment de décider, et vérifier que le palier choisi lève bien la file
d'attente transactionnelle, ce que leur page de vente doit dire noir sur blanc.

Deux points à mesurer APRÈS le changement, sur les mêmes trois mails, pour savoir si ça a marché :
le délai `requests` → `delivered` doit tomber sous la minute.

Si Brevo payant ne tient pas cette promesse, l'alternative est un fournisseur transactionnel
dédié (Postmark, Resend, SES). Ce serait un chantier : les quinze templates vivent dans
`scripts/mails-atelier.mjs` et sont poussés chez Brevo, le webhook de rebonds
(`/api/brevo/webhook`) et `verif-mails-brevo.ts` en dépendent. À ne pas ouvrir avant d'avoir
essayé le plan payant.

**Question pour Mathias** : on passe au plan payant Brevo ?
