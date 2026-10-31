---
id: T-107
titre: Les mails vers Gmail arrivent parfois 5 à 50 minutes en retard, freinés sur une IP partagée de Brevo
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

## ⚠️ 11/09, 13:39 — une quatrième mesure CONTREDIT les trois premières

Le M3 de Klervie (le mail qui porte le lien de paiement, le plus critique des quinze) :

| Mail | `requests` | `delivered` | délai |
|---|---|---|---|
| M3 « MADRID : votre couverture est prête » | 13:38:58 | 13:39:00 | **2 secondes** |

Elle l'a ouvert à 13:39:04 et cliqué à 13:39:23, soit vingt-cinq secondes après la publication.

**Le retard n'est donc PAS structurel.** Sur le même compte, le même plan gratuit, le même
domaine, le même destinataire-type, Brevo remet parfois en deux secondes et parfois en huit
minutes. L'hypothèse « file d'attente des comptes gratuits » ne suffit plus à expliquer l'écart :
elle produirait un retard constant, pas intermittent.

**Ce qu'il faut faire avant de dépenser quoi que ce soit** : mesurer sur une dizaine d'envois
répartis dans la journée (`/v3/smtp/statistics/events`, l'écart `requests` → `delivered`), et
regarder si les lents se groupent à certaines heures ou sur certains destinataires. Payer un plan
pour corriger un défaut qu'on n'a pas caractérisé serait exactement le piège que ce dépôt
documente déjà trois fois (« mesurer avant de conclure »).

Le ticket reste OUVERT, mais sa gravité baisse : le chemin qui compte le plus a été servi en deux
secondes le jour où un vrai client l'attendait.


## 21/10 — caractérisé : Gmail freine une IP PARTAGÉE de Brevo, pas notre domaine

Déclencheur : la recette de l'Édition collective du 21/10. Trois mails à Mathias (« Nouveau lien
des participants » ×2, « Ton espace est prêt ») partis à 11:13, 11:22 et 11:34 sont arrivés
ensemble entre 11:39 et 11:44 (26, 19 et 10 min). Le même destinataire avait reçu le mail de
09:29 en 2 s. Côté site, `mail_envoye` est à la seconde de l'envoi : le site n'y est pour rien.

### La mesure (lecture seule, `scripts/delais-brevo.ts --jours=90`, 01/08 → 21/10)

- **346 envois, 336 remis** (les 10 autres : rebonds et blocages sur des adresses de test).
- Délai `requests` → `delivered` : **médiane 1 s, 9 sur 10 sous 3 s.**
- **25 au-delà d'une minute (7,4 %)**, et seulement chez deux messageries :
  Gmail 23 sur 278, Microsoft 2 sur 28. Orange 0 sur 17, Yahoo 0 sur 7, autres 0 sur 6.
- **Zéro événement `deferred`** en 90 jours. Aucun incident publié sur status.brevo.com aux
  dates des épisodes (relu le 21/10 après l'épisode du jour).

Ce n'est donc **ni ponctuel ni constant** : sept épisodes Gmail sur cinq jours (10/08, 12/08 ×2,
02/09, 11/09 ×2, 21/10), de 4 à 50 min, plus deux cas Microsoft isolés (61 min le 13/10,
6 h 14 le 23/09).

### La signature, qui donne la cause

1. **Les mails d'un épisode sont relâchés ensemble.** 12/08 : sept mails partis entre 12:13:55
   et 12:15:04, tous remis entre 12:39:15 et 12:39:31. 21/10 : 11:39, 11:41, 11:44.
2. **Ils sortent tous par UNE adresse IP de Brevo, et pendant ce temps une AUTRE IP passe.**
   12/08 : les sept lents par 77.32.148.28 ; huit autres mails Gmail partis dans les mêmes
   secondes par 77.32.148.23, remis en 0 à 2 s. 10/08 : le même destinataire, quatre paires
   « paiement reçu » / « commande confirmée » à une seconde d'écart : par .23 en 1 s, par .28 en
   42 à 50 min. Un mail vers kedgebs.com sorti par .28 pendant l'épisode : 1 s.
3. **Seul Gmail est touché par l'IP lente**, comme l'écrit Brevo lui-même : « Emails delayed but
   eventually delivered » = limitation de débit, qui touche les contacts Gmail et pas les autres
   messageries du même envoi ; Gmail réessaie seul
   (help.brevo.com/hc/en-us/articles/36039161138706, lu le 21/10).
4. Google l'explique : le quota d'une IP « is shared for all senders that use that IP address »,
   les quotas DKIM et SPF sont propres au domaine (support.google.com/mail/answer/81126).

**Conclusion.** Gmail limite par moments une IP partagée de Brevo à cause du trafic de TOUS les
clients Brevo qui sortent par elle ; Brevo retient alors nos mails Gmail sur cette IP et les
relâche quand Gmail rouvre. Notre domaine n'est pas en cause : la même seconde, par une autre IP,
Gmail accepte nos mails. **Non prouvé** : Brevo n'enregistre pas le refus temporaire de Gmail
(aucun `deferred`), on voit la conséquence, pas le code SMTP. L'hypothèse du 11/09 (« file
d'attente des comptes gratuits ») est écartée : elle ralentirait toutes les messageries, pas
Gmail seul et par une seule IP.

### Ce que coûterait chaque remède (lu le 21/10 sur les pages officielles, HT)

| Remède | Coût | Ce qu'il change sur CE défaut |
|---|---|---|
| Brevo Starter | 7 €/mois ou 76 €/an (5 000 mails/mois) — catalogue `brevo.com/pricing.md` | Lève le plafond de 300/jour. **Rien de documenté** sur un autre pool d'IP ni une priorité : ne pas compter dessus pour la vitesse |
| Brevo Standard | 15 €/mois ou 162 €/an | Idem, plus logo retiré et support prioritaire |
| IP dédiée Brevo | 251 $/an, **seulement sur Professional** (350 € + 149 € de crédits = 499 €/mois) | Brevo la déconseille sous 100 000 mails/mois (« Dedicated IPs are not suitable for all senders », article 4409354969746). Nous : environ 130 par mois. Une IP neuve, sans historique chez Gmail, serait plus lente, pas plus rapide. **Non** |
| Postmark Basic | 15 $/mois pour 10 000 mails, 100 mails/mois gratuits pour essayer (postmarkapp.com/pricing) | IP partagées « vetted », flux transactionnel et marketing sur des plages d'IP séparées. Données aux États-Unis. Ne garantit rien non plus : à mesurer |

Les alternatives Resend (20 $/mois), Amazon SES (0,10 $ les 1 000) et Mailgun (15 $/mois)
envoient elles aussi par IP partagées à notre volume.

**Question pour Mathias** (page de synthèse du 21/10 : https://claude.ai/artifact/QThHswTb43uRYzL9y5An3T, avec le message prêt pour le support Brevo, NON envoyé) : au premier contrat, Starter reste
utile pour le plafond de 300/jour, mais il ne règle pas ce retard. Avant de payer, demander à
Brevo par écrit (support par mail, inclus dans Free) si une formule payante sort par un autre
pool ; si non, essayer Postmark sur le seul circuit des éditions (`envoyerMailCollectif`, une
fonction, aucun modèle Brevo) et remesurer avec `scripts/delais-brevo.ts`.
