# État du système — au 30/08/2026

**Ce fichier est le SEUL endroit où va un fait périssable.** Un `CLAUDE.md` ne contient que des
règles qui survivent ; tout ce qui porte une date, un identifiant ou une mesure vient ici.
C'est ce qui a pourri l'ancien `CLAUDE.md` : 38 % de son contenu était de l'état, mélangé aux
règles, sans moyen de savoir ce qui avait expiré.

Règle d'entretien : quiconque change l'état du système met ce fichier à jour dans le même geste.
Un fait sans date ne vaut rien — chaque ligne porte la sienne.

---

## Ce qui tourne en production

| Brique | État | Depuis |
|---|---|---|
| Accueil (`/`) — couverture + sept pages du récit | en ligne | 28/08/2026 |
| Page produit (`/magazine`) | en ligne | 28/08/2026 |
| Questionnaire + dépôt (`/composer`) | en ligne, six champs exigés | 28/08/2026 |
| Page cliente (`/numero/<token>`) | en ligne | 21/08/2026 |
| Back-office (`/admin/atelier`) | en ligne | 25/08/2026 |
| Relève quotidienne des mails | armée, 7 h UTC | prouvée le 29/08/2026 à 07:20 |
| Cloudprinter | branché, **sandbox** | recette de bout en bout le 26/08/2026 |
| Stripe | branché | prévente depuis juin, atelier depuis le 24/08 |
| Prévente (`/preventes`, `/lancement`) | retirées, 307 vers `/` | 28/08/2026 |
| Rebonds Brevo (`/api/brevo/webhook`) | **actif**, webhook Brevo id 2158565 | prouvé le 29/08/2026 à 10:14 |

Quatorze fondateurs ont des droits ouverts sous les CGV v2.5, maintenus en régime transitoire.

## Mails Brevo — identifiants réels

Atelier (les douze) : M0=38 · M1=27 · M2=30 · M2b=37 · M3=28 · M3b=31 · M4=29 · M5=32 · M6=33 ·
M7=34 · M8=35 · M9=36. Prévente : F1=17 · S1=18 · P3=19 · A1=20 · A2=21 · A3=22 · Relance=23.
Le texte est versionné dans `scripts/mails-atelier.mjs`, pas dans l'interface Brevo.
`--pousser` réécrit les DIX templates de l'atelier ; borner avec `--seulement <CODE>`.

## Les rebonds — actifs, et prouvés de bout en bout (29/08/2026)

`BREVO_WEBHOOK_SECRET` est posé sur Vercel (Production) et le webhook Brevo existe :
**id 2158565**, type `transactional`, événements `hardBounce` / `blocked` / `invalid` / `spam`,
en-tête `x-bellajour-secret`.

**Recette réelle, pas simulée.** Un dossier créé sur `rebond-test@bellajour.com` — boîte
inexistante de notre propre domaine, donc aucun tiers impliqué et aucune adresse inventée chez
un fournisseur qui abîmerait la réputation d'expéditeur :

| | |
|---|---|
| 10:14:41 | dossier créé |
| 10:14:42 | M0 part |
| **10:14:56** | **`email_rebond` au journal**, motif SMTP complet (`550 5.1.1 … User doesn't exist`) |

Quatorze secondes. Dossier de test supprimé ensuite (1 mail, 3 événements, 1 numéro).

⚠️ **Brevo n'a AUCUN endpoint de test de webhook** (`POST /v3/webhooks/{id}/test` → 404). La
seule façon d'éprouver cette chaîne est de provoquer un vrai rebond.

⚠️ **Le branchement rend RÉELS deux défauts relevés en relecture** : T-036 (la graphie `invalid`
pourrait être ignorée en silence) et T-038 (la route rend 200 même si l'écriture au journal a
échoué, donc Brevo ne réessaie pas). T-038 était théorique tant que la route rendait 404 ; elle
ne l'est plus.

Le garde-fou de saisie (`suggestionEmail`, écran 4) est autonome : aucune variable, aucune
configuration. Vérifié en production le 29/08 — `flore@gmial.com` propose `flore@gmail.com`,
`m.durand@bellajour.com` est laissé tranquille.

## Migrations

18 fichiers sur disque, 16 dans l'historique appliqué.

`20260829_atelier_tracking_code.sql` **appliquée et vérifiée le 30/08/2026** (T-001 fermé,
fiche `docs/backlog/fermes/`). La preuve de bout en bout avec un vrai colis reste à faire.

Trois anciennes (`20260528_g1_email_canonical`, `20260528_g3_pages_credits_unique_source`,
`20260704_notion_synced`) sont absentes de l'historique mais leurs colonnes existent : appliquées
hors CLI. Deux entrées de l'historique n'ont pas de fichier : `prevente_ambassador_system` (qui
crée `waitlist`, `pages_credits`, `invoice_jobs`) et `fondateur_assign_by_email_canonical`.

## Variables d'environnement

47 sont réellement lues par le code. `.env.example` en documente une partie seulement — douze
vivantes y manquent (voir T-011). **Une variable absente ne casse pas : elle fait un silence.**
`/admin/atelier/sante` est le seul écran qui montre un mail sans template.

À vérifier sur Vercel, Production ET Preview, avant le lancement :
`BREVO_TEMPLATE_M0_ID` (posée le 28/08), les onze autres templates de l'atelier,
`ADMIN_PASSWORD_MATHIAS`, `ADMIN_PASSWORD_LOUIS`, `CRON_SECRET`, `ATELIER_MAILS_SECRET`,
`CLOUDPRINTER_API_KEY` + `CLOUDPRINTER_WEBHOOK_KEY`, les cinq `R2_*`, `PREVENTE_FERMEE`.

## ⚠️ L'atelier n'est pas encore en fonctionnement (30/08/2026)

Le tunnel est OUVERT au public et il crée de vrais dossiers, mais **l'atelier ne compose pas
encore**. Des clientes s'inscrivent en avance ; leurs numéros seront faits plus tard, et elles
sont prévenues à la main par mail.

**À lire avant de crier au dossier oublié.** Au 29/08, quatre dossiers sont en base, tous à
l'état `photos_recues`, trois avec leur dépôt terminé. Le plus ancien (Marjorie, 49 photos, 25/08)
attend depuis cinq jours alors que `DELAIS.photos_recues` promet « Couverture sous 48 h ».
**Ce n'est pas une défaillance** : c'est une inscription anticipée, et Mathias l'a prévenue
par mail — c'est Marjorie, « Notre histoire », 49 photos.
`/admin/atelier/sante` les comptera pourtant comme « oubliés », puisqu'il ne connaît que la
promesse. Le constat est juste selon sa règle, et faux selon la réalité.

Deux conséquences à garder en tête tant que l'atelier n'a pas ouvert :
1. La page `/numero/<token>` annonce « Votre couverture arrive **sous 48 h** » **sans condition** —
   la même phrase après deux heures et après cinq jours. C'est le seul endroit où le site dit
   autre chose que ce que Mathias écrit à la main.
2. Rien ne part automatiquement pour contredire un mail manuel : `mails.ts` arrête toute relance
   dès que le dépôt est terminé (« Elle a fait ce qu'on lui demandait ; le trou est de notre
   côté »). C'est le bon comportement, et il tient pendant cette période.

À supprimer de ce fichier le jour où l'atelier compose vraiment.

## 🔴 EN ATTENTE — un correctif fusionné mais JAMAIS déployé (30/08/2026, 18h50 UTC)

**`main` est en avance sur la production.** À reprendre en priorité à la prochaine séance.

| | |
|---|---|
| `main` pointe sur | `86fb3e2` (fusion de la PR #11, le compteur) |
| Dernier déploiement de PRODUCTION | `5c170a72` — la PR #10, les titres |
| Déploiement pour `86fb3e2` | **aucun**, douze minutes après la fusion |

Ce n'est ni une file d'attente ni un échec de compilation : Vercel n'a créé **aucun**
déploiement pour cette fusion — pas de trace réussie, annulée ni en erreur. La fusion
précédente (PR #10) avait produit le sien en quelques minutes.

**Conséquence visible** : sur bellajour.fr, le compteur de la page 02 affiche encore `0`
sans JavaScript, alors que le correctif est dans `main`.

**Comment reprendre** : tableau de bord Vercel → Deployments → le déploiement de production
le plus récent → les trois points → **Redeploy**, en décochant « Use existing build cache ».
Cela reconstruit depuis l'état actuel de `main`, qui contient déjà le correctif.

⚠️ Ne PAS forcer avec un commit vide sur `main` : c'est un push sur `main`, interdit par le
socle, et le garde-fou le refuse. Un problème d'infrastructure ne justifie pas de contourner
la règle qui protège la production.

**À vérifier une fois redéployé** — la commande qui tranche, cache contourné :
```bash
curl -s -H "Cache-Control: no-cache" "https://www.bellajour.fr/?v=$(date +%s)" | grep -o 'data-compte="12480">[^<]*<'
```
Doit rendre `12 480`, pas `0`. ⚠️ Ne pas chercher `12` dans la ligne entière : `12480` est
déjà dans l'attribut, un test naïf conclut à la réussite quoi qu'il arrive.

## Ce qui n'est pas mesuré

Aucun traceur d'audience. On ne sait pas combien de visiteuses arrivent, sur quel appareil, ni où
elles partent. Aucun rebond Brevo n'est traité : une adresse mal tapée tue un dossier en silence.
Aucune remontée d'erreur serveur autre que les logs Vercel. Voir T-020.

## Le piège de la mitigation Vercel

Vercel peut répondre **403** avec `x-vercel-mitigated: challenge` à tout client non-navigateur
sur un trafic qu'il juge robotique. Ce n'est pas un réglage, ça s'éteint seul. Un navigateur
passe ; Stripe et `scripts/recette.mjs` non. Test : `curl -X POST …/api/webhook` doit rendre
**400** (`missing_signature`) ; 403 = épisode en cours, attendre.
⚠️ **Ne pas couper le pare-feu** — « Attack Challenge Mode » est au niveau du PROJET et
découvrirait aussi bellajour.fr. Stripe réessaie trois jours, et l'événement se renvoie à la main.

## Avant la bascule en LIVE

Cinq tiers à faire passer en production, chacun avec son interrupteur et sa vérification :
`docs/reference/BASCULE-LANCEMENT.md`. Deux points se décident AVANT le jour J : l'immatriculation
portugaise chez Stripe Tax (le câblage TVA est inerte sans elle) et les finitions Cloudprinter
(T-027). **Un mode test resté branché ne fait pas d'erreur, il fait un silence.**
